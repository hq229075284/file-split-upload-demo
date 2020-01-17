const fileInput = document.querySelector('#upload')
const block_btyes = 4 * 1024 * 1024 // 4M
// const block_btyes = 10 * 1024 // 10KB
const fileMap = {}
fileInput.addEventListener('change', function (e) {
    const file = e.target.files[0]
    const instance = new Upload(file)
    // calcBuffer(file)
    this.value = ''
    console.log(file.size)
    console.log('blocks:', instance.blocks)
    // if (blocks.length <= sendIndex + 1) {
    //     console.error('先清sessioStorage')
    //     return
    // }
    fileMap[instance.fileId] = createDom(instance)
    document.body.appendChild(fileMap[instance.fileId])
    instance.start().then(() => {
        console.info('上传完成')
    })
    // new Promise((resolve) => {
    //     loop(resolve)
    // }).then(() => {
    //     console.info('上传完成')
    // })
})

function createDom(instance, percent = 0) {
    const container = document.createElement('div')
    container.classList.add('container')
    const outer = document.createElement('div')
    outer.classList.add('outer')
    const inner = document.createElement('div')
    inner.classList.add('inner')
    inner.style.width = percent * 100 + '%'

    // const startText=document.createElement('span')
    // startText.classList.add('text')

    const percentText = createText('text percent', (percent * 100).toFixed(2) + '%')
    const startText = createText('text', '开始')
    startText.style.display = 'none'
    const pauseText = createText('text', '暂停')
    const cancelText = createText('text', '取消')

    outer.appendChild(inner)
    container.appendChild(outer)
    container.appendChild(percentText)
    container.appendChild(startText)
    container.appendChild(pauseText)
    container.appendChild(cancelText)

    startText.addEventListener('click', onStart(instance, pauseText))
    pauseText.addEventListener('click', onPause(instance, startText))
    cancelText.addEventListener('click', onCancel(instance, container))
    return container
}

function createText(className, text) {
    span = document.createElement('span')
    className.split(' ').forEach(_className => {
        span.classList.add(_className)
    })
    span.innerText = text
    return span
}
function updatePercent(container, percent = 0) {
    container.querySelector('.inner').style.width = `${percent * 100}%`
    container.querySelector('.percent').innerText = `${(percent * 100).toFixed(2)}%`
}
function onStart(instance, toggleNode) {
    return function (e) {
        instance.start().then(() => {
            console.info('上传完成')
        })
        e.currentTarget.style.display = 'none'
        toggleNode.style.display = 'inline'
    }
}
function onPause(instance, toggleNode) {
    return function (e) {
        instance.pause()
        e.currentTarget.style.display = 'none'
        toggleNode.style.display = 'inline'
    }
}

function onCancel(instance, container) {
    return function (e) {
        instance.abort()
        container.remove()
    }
}

function calcBuffer(file) {
    const reader = new FileReader()
    reader.onload = function (e) {
        console.log(e.target.result)
    }
    reader.readAsArrayBuffer(file)
}

function ajax(blob, params, head = {}) {
    let xhr
    const p = new Promise((resolve) => {
        xhr = new XMLHttpRequest()
        for (let key in head) {
            xhr.setRequestHeader(key, head[key])
        }
        const querystring = Object.entries(params).reduce((prev, [key, value]) => {
            prev.push(`${key}=${value}`)
            return prev
        }, []).join('&')
        xhr.open('post', 'http://localhost:5555?' + querystring)
        xhr.send(blob)
        xhr.onreadystatechange = function (e) {
            if (this.status === 200 && this.readyState === 4) {
                resolve(this.responseText)
            }
        }
    })
    return {
        xhr,
        p
    }
}

// 由于刷新后之前上传的文件已丢失，所以不考虑刷新后续传
class Upload {
    sendIndex = -1
    blocks = []
    fileName = ''
    suffix = ''
    fileSize = 0
    fileId = ''
    status = ''
    START = 'start'
    PAUSE = "pause"
    ABORT = "abort"
    uploadedPieces = []
    xhrList = []
    constructor(file) {
        const reg = /(.*?)(?:\.(\w+))?$/
        const matched = reg.exec(file.name)
        this.fileName = matched[1]
        this.suffix = matched[2] || ''
        this.fileSize = file.size
        // TODO:可以尝试file转ArrayBuffer后通过buffer生成hash来作为fileId
        this.fileId = md5(`${file.name}-${file.size}-${file.type}-${Date.now()}`)
        console.log(file.size)
        let last_btyes_index = 0
        while (last_btyes_index < file.size - 1) {
            const block = file.slice(last_btyes_index, last_btyes_index + block_btyes)
            this.blocks.push(block)
            last_btyes_index = last_btyes_index + block_btyes
        }
    }
    // updateUploadedPiece(piece){
    //     this.uploadedPieces.push(piece)
    // }
    start() {
        this.status = this.START
        return Promise.all(this.blocks.map((block, blockIndex) => {
            if (this.uploadedPieces.includes(blockIndex)) return Promise.resolve()
            return new Promise(resolve => {
                calcBuffer(this.blocks[blockIndex])
                const { xhr, p } = ajax(this.blocks[blockIndex], {
                    suffix: this.suffix,
                    fileSize: this.fileSize,
                    fileId: this.fileId,
                    fileName: this.fileName,
                    blockIndex,
                    blockLength: this.blocks.length
                }, {})
                p.then(() => {
                    const index = this.xhrList.indexOf(xhr)
                    this.xhrList.splice(index, 1)
                    this.uploadedPieces.push(blockIndex)
                    console.log(`第${blockIndex + 1}块数据上传成功`)
                    const container = fileMap[this.fileId]
                    updatePercent(container, this.uploadedPieces.length / this.blocks.length)
                })
                this.xhrList.push(xhr)
            })
        }))
    }
    pause() {
        this.status = this.PAUSE
        this.xhrList.forEach(xhr => xhr.abort())
        this.xhrList = []
    }
    abort() {
        this.status = this.ABORT
        this.xhrList.forEach(xhr => xhr.abort())
        this.xhrList = []
    }
    restart() { }
}