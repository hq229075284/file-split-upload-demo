// nodemon index.js

const http = require('http')
const url = require('url')
const fs = require('fs')
const path = require('path')
const stream = require('stream');
const fileMapPath = path.join(__dirname, './fileMap.json')
// const fileMap = require(fileMapPath)
const fileMap = {}
const blockSize = 4 * 1024 * 1024
// const blockSize = 10 * 1024
const server = http.createServer((req, res) => {
    const { query } = url.parse(req.url, true)
    const fileId = query.fileId
    const suffix = query.suffix
    const fileSize = query.fileSize
    const blockIndex = query.blockIndex
    const folder = path.join(__dirname, 'pieces', query.fileId)
    const images = path.join(__dirname, './images')
    if (!fs.existsSync(images)) {
        fs.mkdirSync(images)
    }
    const target = path.join(images, query.fileName + '-' + query.fileId + suffix ? '.' + suffix : '')
    function getSlicePath(index) {
        return path.join(folder, query.fileName + '-' + index)
    }
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder)
    }
    if (req.method === "POST") {
        const getInitState = () => ({ length: 0, done: false })
        let fileDescription = fileMap[target]
        if (!fileDescription) {
            fileMap[target] = fileDescription = getInitState()
        }
        if (fileDescription.done) {
            console.log('delete')
            fs.unlinkSync(target)
            fileMap[target] = fileDescription = getInitState()
            // res.writeHead(200, {
            //     'Access-Control-Allow-Origin': req.headers.origin
            // })
            // res.end('成功', 'utf8')
            // return
        }
        let lastLength = fileDescription.length
        let totalLength = blockIndex * blockSize
        // let buffers = []
        req.on('data', function (chunk) {
            // buffers.push(chunk)
            // console.log(chunk)
            // const source_stream=new stream.Readable({
            //     highWaterMark:4 * 1024 * 1024,
            //     read(size){
            //         // console.log(size)
            //         this.push(chunk)
            //         this.push(null)
            //     }
            // })

            totalLength += chunk.length
            if (lastLength < totalLength) {
                // console.log('blockIndex:', blockIndex)
                // const diff = totalLength - lastLength
                // buffers.push(chunk.slice(totalLength - diff, totalLength))
                lastLength = totalLength
                fileMap[target].length = lastLength
                fs.writeFileSync(getSlicePath(blockIndex), chunk)
                if (totalLength == fileSize) {
                    for (let i = 0; i <= blockIndex; i++) {
                        const piece = fs.readFileSync(getSlicePath(i))
                        fs.appendFileSync(target, piece)
                        fs.unlinkSync(getSlicePath(i))
                    }
                    fs.rmdirSync(folder)
                    fileMap[target].done = true
                }
                fs.writeFileSync(fileMapPath, JSON.stringify(fileMap, null, 4), () => { })
            }

            // let buffers = [];
            // source_stream.on('data', (data) => buffers.push(data))
            // source_stream.on('end', () => {
            //     console.log(buffers)
            //     console.log(chunk)
            // })
            // const target_stream = fs.createWriteStream(target)
            // source_stream.pipe(target_stream)
            // fs.writeFileSync(target, buffers)
            // fs.appendFileSync(target, chunk)
        })
        req.on('end', function () {
            // fs.writeFileSync(fileMapPath, JSON.stringify(fileMap, null, 4), () => { })
            // if (blockIndex == 4) {
            //     console.log('block:', blockIndex, '=>', Buffer.concat(buffers))
            // }
            res.writeHead(200, {
                'Access-Control-Allow-Origin': req.headers.origin
            })
            res.end('成功', 'utf8')
        })
    } else {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': req.headers.origin
        })
        res.end('')
    }
})
server.listen('5555', function () { console.log('listen at 5555') })