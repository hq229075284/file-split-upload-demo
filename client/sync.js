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
    instance.start()
    let waitUpdatePrecent = true
    function loop(resolve) {
        const doAjax = () => {
            ajax(instance.blocks[instance.sendIndex + 1], {
                suffix: instance.suffix,
                fileSize: instance.fileSize,
                fileId: instance.fileId,
                fileName: instance.fileName,
                blockIndex: instance.sendIndex + 1,
                blockLength: instance.blocks.length
            }, {}).then(() => {
                instance.sendIndex++
                console.log(`第${instance.sendIndex + 1}块数据上传成功`)
                if (instance.sendIndex === instance.blocks.length - 1) {
                    updatePercent(fileMap[instance.fileId], (instance.sendIndex + 1) / instance.blocks.length)
                    resolve()
                } else {
                    if (waitUpdatePrecent) {
                        waitUpdatePrecent = false
                        updatePercent(fileMap[instance.fileId], (instance.sendIndex + 1) / instance.blocks.length)
                        setTimeout(() => {
                            waitUpdatePrecent = true
                        }, 1000)
                    }
                    loop(resolve)
                }
            })
        }
        if (instance.status === instance.ABORT) {
            console.log('abort')
            return
        }
        if (instance.status === instance.PAUSE) {
            console.log('pause')
            instance.restart = doAjax
            return
        }
        doAjax()
    }
    new Promise((resolve) => {
        loop(resolve)
    }).then(() => {
        console.info('上传完成')
    })
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
        instance.start()
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
    return function () {
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
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest()
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
        this.sendIndex = -1
    }
    start() {
        this.status = this.START
        this.restart()
        this.restart = function () { }
    }
    pause() {
        this.status = this.PAUSE
    }
    abort() {
        this.status = this.ABORT
    }
    restart() { }
}