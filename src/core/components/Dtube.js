class Dtube {
    constructor(self) {
        this.self = self;
    }
    _fetchAvalon(author, id) {
        return new Promise((resolve, reject) => {
            this.self.avalon.getContent(author, id, (err, content) => {
                if(err) return reject(err);
                return resolve(content)
            })
        })
    }
    async _fetchHive(author, id) {
        throw "Not implemented yet!"
    }
    async _fetchSteem(author, id) {
        throw "Not implemented yet!"
    }
    async fetchPost(author, id) {
        try {
            return await this._fetchAvalon(author, id)
        } catch {
            //Do nothing
        }
        try {
            return await this._fetchAvalon(author, id)
        } catch {
            //Do nothing
        }
        try {
            return await this._fetchSteem(author, id)
        } catch {
            //Do nothing
        }
        throw "Post not found"
    }
}
module.exports = Dtube;