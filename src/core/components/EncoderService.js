const debug = require("debug")("oneloveEncoder:encoder");
const pQueue = require('p-queue').default;
const tmp = require('tmp')
const Path = require('path')
const pathToFfmpeg = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg')
const globSource = require('ipfs-utils/src/files/glob-source')
const EventEmitter = require('events')
const fs = require('fs')
ffmpeg.setFfmpegPath(pathToFfmpeg)

let exampleJob = {
    sourceHash: "Qm123...",
    config: {
        resolutions: {
            "240p": {
                height: 240,
                width: 480,
                size: "480x240"
            },
            "480p": {
                height: 480,
                width: 858,
                size: "858x480"
            },
            "720p": {
                height: 720,
                width: 1280,
                size: "1280x720"
            },
            "1080p": {
                height: 1080,
                width: 1920,
                size: "1920x1080"
            }
        }
    },
    output: {
        encodes: {

        }
    }
}
class EncoderWorker {
    constructor(ipfs) {
        this.ipfs = ipfs;
        this.job = null;
        this._status = {
            ready: true,
            totalParts: null,
            doneParts: null
        }
        this.acceptingJobs = true;
        this.events = new EventEmitter();
    }
    /**
     * Validates a job by fields and subfields
     * @param {*} job 
     */
    validate(job) {

    }
    async runJob(job) {
        this.job = job;
        this._status = {
            ready: false,
            totalParts: Object.keys(job.config.resolutions).length,
            doneParts: 0
        }
        await this._proc()
    }
    async fetch(sourceHash, parentFile) {
        var targetPath = Path.join(parentFile, sourceHash);
        for await(var chunk of this.ipfs.cat(sourceHash)) {
            fs.appendFileSync(targetPath, chunk)
        }
        return targetPath;
    }
    async _proc() {
        this.job.output = {encodes: {}}
        var tmpDir = tmp.dirSync();
        debug(`Fetching ipfs file: ${this.job.sourceHash}`)
        var sourcePath = await this.fetch(this.job.sourceHash, tmpDir.name);
        for(var res in this.job.config.resolutions) {
            var resInfo = this.job.config.resolutions[res];
            var outputPath = Path.join(tmpDir.name, `${res}.mp4`);
            debug(`Encoding: ${res}`)
            await (() => {
                return new Promise((resolve, reject) => {
                    ffmpeg(sourcePath).size(resInfo.size).on('end', () => {
                        return resolve();
                    }).on('error', (err) => {
                        return reject(err)
                    }).on('progress', (progress) => {
                        this.events.emit("encode.progress", progress)
                    })
                    .save(outputPath);
                })
            })();
            var outHash;
            for await(var out of this.ipfs.add(globSource(outputPath), {pin: false})) {
                outHash = out.cid
            }
            debug(`finished encoding for ${res}; Hash is ${outHash}`)
            //Encode info
            var encode_info = {
                cid: outHash.toString(),
                name: res
            }
            this.job.output.encodes[res] = encode_info
            this.events.emit("encode.completed", encode_info)
        }
        this._status.ready = true;
    }
    async progress() {

    }
    async status() {
        return this._status;
    }
}

class EncoderService {
    constructor(self) {
        this.self = self;
        this.queue = new pQueue();
        /**
         * @type {EncoderWorker[]}
         */
        this.workers = [];
        this.events = new EventEmitter();
    }
    async start() {
        this.workers.push(new EncoderWorker(this.self.ipfs));

        /**
         * Firing loop
         */
        setInterval(async() => {
            for(var worker of this.workers) {
                if((await worker.status()).ready) {
                    this.events.emit("workers.ready", worker)
                }
            }
        }, 15000);
    }
    _handle(sourceHash) {
        return new Promise(async(resolve, reject) => {
            try {
                var job = {
                    sourceHash,
                    config: {
                        resolutions: {
                            "240p": {
                                height: 240,
                                width: 480,
                                size: "480x240"
                            },
                            "480p": {
                                height: 480,
                                width: 858,
                                size: "858x480"
                            },
                            "720p": {
                                height: 720,
                                width: 1280,
                                size: "1280x720"
                            },
                            "1080p": {
                                height: 1080,
                                width: 1920,
                                size: "1920x1080"
                            }
                        }
                    }
                }
                for(var worker of this.workers) { 
                    if((await worker.status()).ready) {
                        debug("Allocating job to worker")
                        await worker.runJob(job)
                        return resolve();
                    }
                }
                this.events.once("workers.ready", async(worker) => {
                    await worker.runJob(job)
                    return resolve();
                })
                
            } catch(err) {
                return reject(err)
            }
        })
    }
    addToQueueFromdtube(dtubePermaLink, options) {
        return new Promise((resolve, reject) => {
            var permalinkSplit = dtubePermaLink.split("/").reverse()
            var id = permalinkSplit[0];
            var author = permalinkSplit[1];
            let sourceHash;
            this.self.avalon.getContent(author, id, (err, content) => {
                if(err) return reject(err);
                if(content.json.files.ipfs) {
                    if(content.json.files.ipfs.vid.src) {
                        sourceHash = content.json.files.ipfs.vid.src;
                    } else {
                        return reject("Dtube post does not contain a ipfs source resolution")
                    }
                } else {
                    return reject("Dtube post does not contain a ipfs source resolution")    
                }
                debug(`Obtained ipfs source hash for ${dtubePermaLink}, ipfs source is ${sourceHash}`);
                this.queue.add(async () => await this._handle(sourceHash))
                

                return resolve();
            })
        })
    }
}
module.exports = EncoderService