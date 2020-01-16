const fileInput = document.querySelector('#upload')
// const block_btyes = 4 * 1024 * 1024 // 4M
const block_btyes = 10 * 1024 // 10KB
fileInput.addEventListener('change', function (e) {
    const file = e.target.files[0]
    // calcBuffer(file)
    this.value = ''
    const suffix = file.name.split('.')[1]
    const fileSize = file.size
    const fileId = 1
    console.log(file.size)
    let last_btyes_index = 0
    const blocks = []
    while (last_btyes_index < file.size - 1) {
        const block = file.slice(last_btyes_index, last_btyes_index + block_btyes)
        blocks.push(block)
        last_btyes_index = last_btyes_index + block_btyes
    }
    let sendIndex = +sessionStorage.getItem(fileId) || -1
    console.log('blocks:', blocks)
    if (blocks.length <= sendIndex + 1) {
        console.error('先清sessioStorage')
        return
    }
    function loop(resolve) {
        if (sendIndex === 3) {
            calcBuffer(blocks[sendIndex + 1])
        }
        ajax(blocks[sendIndex + 1], {
            suffix,
            fileSize,
            fileId,
            blockIndex: sendIndex + 1,
        }, {}).then(() => {
            sendIndex++
            console.log(`第${sendIndex + 1}块数据上传成功`)
            sessionStorage.setItem(fileId, sendIndex)
            if (sendIndex === blocks.length - 1) {
                resolve()
            } else {
                loop(resolve)
            }
        })
    }
    new Promise((resolve) => {
        loop(resolve)
    }).then(() => {
        console.info('上传完成')
    })
})

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