
const path = require('path')
const {buildDict} = require('./char_dict')
const cn = buildDict(path.join(__dirname, 'cn.txt'))
const jp = buildDict(path.join(__dirname, 'jp.txt'))

const getVariants = (text) => text.split('').map((c) => [...(cn[c] || []), ...(jp[c] || []), c])

const match = (a, b) => {
    if(!a || !b) return a == b
    if(a.length != b.length) return false
    const varA = getVariants(a)
    const varB = getVariants(b)
    return varA.every((list, i) => list.some((c) => varB[i].includes(c)))
}

module.exports = {getVariants, match}
