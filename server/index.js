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
const pieces = path.join(__dirname, './pieces')
if (!fs.existsSync(pieces)) {
    fs.mkdirSync(pieces)
}
const images = path.join(__dirname, './images')
if (!fs.existsSync(images)) {
    fs.mkdirSync(images)
}
const server = http.createServer((req, res) => {
    const { query } = url.parse(req.url, true)
    const fileId = query.fileId
    const suffix = query.suffix
    const fileSize = +query.fileSize
    const blockLength = +query.blockLength
    const blockIndex = +query.blockIndex
    const folder = path.join(pieces, query.fileId)
    const target = path.join(images, query.fileName + '-' + query.fileId + (suffix ? '.' + suffix : ''))
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
        let buffers = []
        let bufferLength = 0
        req.on('data', function (chunk) {
            buffers.push(chunk)
            bufferLength += chunk.length
        })
        req.on('end', function () {
            fs.writeFileSync(getSlicePath(blockIndex), Buffer.concat(buffers, bufferLength))
            const exsitFiles = fs.readdirSync(folder)
            if (exsitFiles.length == blockLength) {
                for (let i = 0; i < blockLength; i++) {
                    const piece = fs.readFileSync(getSlicePath(i))
                    // console.log(piece.length)
                    fs.appendFileSync(target, piece)
                    fs.unlinkSync(getSlicePath(i))
                }
                fs.rmdirSync(folder)
                fileMap[target].done = true
                // fs.writeFileSync(fileMapPath, JSON.stringify(fileMap, null, 4), () => { })
            }
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