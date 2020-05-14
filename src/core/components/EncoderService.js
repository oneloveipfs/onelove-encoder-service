const debug = require("debug")("oneloveEncoder:encoder");
const pQueue = require('p-queue').default;
const tmp = require('tmp')
const Path = require('path')
const pathToFfmpeg = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg')
const globSource = require('ipfs-utils/src/files/glob-source')
const EventEmitter = require('events')
const fs = require('fs')
const Crypto = require('crypto')
const base64url = require('base64url')
ffmpeg.setFfmpegPath(pathToFfmpeg)

let exampleJob = {
    sourceHash: "Qm123...",
    config: {
        profiles: {
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
        if (!job.id) {
            job.id = base64url.encode(Crypto.randomBytes(8))
        }
        this.job = job;
        this._status = {
            ready: false,
            totalStages: Object.keys(job.config.profiles).length,
            doneStages: 0
        }
        this._workerStatus = {
            busy: true
        }
        this._proc()
        return job.id;
    }
    async fetch(sourceHash, parentFile) {
        if (typeof sourceVideo === "object") {
            //Fetch multiple source networks here. Example ipfs, siacoin. Will use first fetched.
        } else {
            //Assume string CID/ipfs hash.
            debug(`Fetching ipfs file: ${this.job.sourceVideo}`)
            var targetPath = Path.join(parentFile, sourceHash);
            for await (var chunk of this.ipfs.cat(sourceHash)) {
                fs.appendFileSync(targetPath, chunk)
            }
            return targetPath;
        }
    }
    async _proc() {
        this.job.output = { profiles: {} }
        var tmpDir = tmp.dirSync();
        var sourcePath = await this.fetch(this.job.sourceVideo, tmpDir.name);

        for (var profileName in this.job.config.profiles) {
            var resInfo = this.job.config.profiles[profileName];
            var outputPath = Path.join(tmpDir.name, `${profileName}.mp4`);
            debug(`Encoding: ${profileName}`)
            await (() => {
                return new Promise((resolve, reject) => {
                    ffmpeg(sourcePath).size(resInfo.size).on('end', () => {
                        this._status.doneStages += 1;
                        return resolve();
                    }).on('error', (err) => {
                        return reject(err)
                    }).on('progress', (progress) => {
                        this.events.emit("stage.progress", progress)
                    }).save(outputPath);
                })
            })();
            var outHash;
            for await (var out of this.ipfs.add(globSource(outputPath), { pin: false, trickle: true })) {
                outHash = out.cid
            }
            debug(`finished encoding for ${profileName}; Hash is ${outHash}`)
            //Encode info
            var encode_info = {
                cid: outHash.toString(),
                name: profileName
            }
            this.job.output.encodes[res] = encode_info
            this.events.emit("stage.completed", encode_info)
        }
        this.events.emit("completed", job.id)
        this._status.ready = true;
    }
    async progress() {

    }
    async status() {
        this._status.job = this.job
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
        this.jobs = {};
        this.events = new EventEmitter();
    }
    async start() {
        this.workers.push(new EncoderWorker(this.self.ipfs));

        /**
         * Firing loop
         */
        setInterval(async () => {
            for (var worker of this.workers) {
                if ((await worker.status()).ready) {
                    this.events.emit("workers.ready", worker)
                }
            }
        }, 15000);
    }
    async getStatus(id) {
        if (!this.jobs[id]) {
            throw "Job with supplied ID does not exist"
        }
        return await this.jobs[id].worker.status()
    }
    _handle(job) {
        return new Promise(async (resolve, reject) => {
            try {
                var launchJob = async (worker, job) => {
                    var sid = await worker.runJob(job)
                    this.jobs[sid] = {
                        status: "running",
                        worker
                    }
                    worker.once("completed", async (id) => {
                        //id included for safety reasons and future changes
                        this.jobs[id] = {
                            status: "done"
                        }
                        await this.self.db.collection("past_encodes").insertOne({
                            
                        })
                    })
                    return resolve();
                }
                for (var worker of this.workers) {
                    if ((await worker.status()).ready) {
                        debug("Allocating job to worker")
                        await launchJob(worker, job)
                    }
                }
                this.events.once("workers.ready", async (worker) => {
                    await launchJob(worker, job)
                })

            } catch (err) {
                return reject(err)
            }
        })
    }
    async addToQueue(sourceHash) {
        var id = base64url.encode(Crypto.randomBytes(8))
        var job = {
            sourceVideo: sourceHash,
            id,
            config: {
                profiles: {
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
        this.jobs[id] = {
            status: "queued"
        }

        this.queue.add(async () => await this._handle(job))
        return id;
    }
    addToQueueFromdtube(dtubePermaLink, options) {
        return new Promise(async (resolve, reject) => {
            try {
                var permalinkSplit = dtubePermaLink.split("/").reverse()
                var postId = permalinkSplit[0];
                var author = permalinkSplit[1];
                let sourceHash;
                var content = await this.self.dtube.fetchPost(author, postId);
                if (content.json.files.ipfs) {
                    if (content.json.files.ipfs.vid.src) {
                        sourceHash = content.json.files.ipfs.vid.src;
                    } else {
                        return reject("Dtube post does not contain a ipfs source resolution")
                    }
                } else {
                    return reject("Dtube post does not contain a ipfs source resolution")
                }
                debug(`Obtained ipfs source hash for ${dtubePermaLink}, ipfs source is ${sourceHash}`);
                var id = await this.addToQueue(sourceHash)


                return resolve(id);

            } catch (err) {
                return reject(err)
            }
        })
    }
}
module.exports = EncoderService