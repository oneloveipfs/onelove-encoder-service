# onelove-encoder-service
> A low cost video encoder for OneLoveIPFS service

The onelove encoder service aims to fix common problems with the decentralized video site called Dtube.
The biggest issue is having enough processing power to encode the masses of videos being uploaded on a daily basis.
This software will be capable of taking dtube permalink as input, grab metadata, begin encoding of source video file 
and dynamically update the post as resolutions are encoded.

### Pricing
Pricing is calculated dynamically based upon video length, and a predecided cost per minute factor.
Pricing metric has additional paramers based upon how long an encode typically takes for a particular resolution, file size, and quality.
DTC, Steem, and hive will be accepted as payment through this system.

### Install
Github clone

```
git clone https://github.com/oneloveipfs/onelove-encoder-service
cd onelove-encoder-service
npm install
```

### Usage
```
npm run dev:daemon
```
Start a debug mode daemon with HTTP API on localhost:3000 by default.

# License
GPLv3. See [License](https://github.com/oneloveipfs/onelove-encoder-service/blob/master/LICENSE)
