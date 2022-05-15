
const fs = require('fs')

const head = [
    `COPY kkutu_lzh (_id, type, mean, hit, flag, theme) FROM stdin;`
]

const charFilter = /[\u4E00-\u9FFF\u3400-\u4DBF]/
const filterWord = (str) => str.split('').every((c) => charFilter.test(c))

let comments = []

let cedict = fs.readFileSync('cedict_1_0_ts_utf-8_mdbg.txt').toString().split('\n')
cedict.filter((line) => line.startsWith('#')).forEach((line) => comments.push(line))
cedict = cedict.filter((line) => !line.startsWith('#') && line.trim())
cedict = cedict.map((line) => line.split(' '))
cedict = cedict.filter((line) => line.length >= 2).map((line) => line.slice(0, 2))
cedict = cedict.filter(([trad, simp]) => filterWord(trad) && filterWord(simp))
let cedictTrad = cedict.map(([trad, simp]) => trad)
let cedictSimp = cedict.map(([trad, simp]) => simp)

let hanja = fs.readFileSync('hanja.txt').toString().split('\n')
hanja.filter((line) => line.startsWith('#')).forEach((line) => comments.push(line))
hanja = hanja.filter((line) => !line.startsWith('#') && line.trim())
hanja = hanja.map((line) => line.split(':'))
hanja = hanja.filter((line) => line.length >= 2).map((line) => line[1])
hanja = hanja.filter((hanja) => filterWord(hanja))

const generateMozc = (file) => {
    let lines = fs.readFileSync(file).toString().split('\n')
    lines = lines.map((line) => line.split('\t'))
    lines = lines.filter((line) => line.length >= 5).map((line) => line[4])
    lines = lines.filter((line) => filterWord(line))
    return lines
}

let mozc = new Array(10).fill().map((_, i) => i.toString(10).padStart(2, '0')).map((n) => `dictionary${n}.txt`)
mozc = mozc.flatMap((file) => generateMozc(file))

let result = [...cedictTrad, ...cedictSimp, ...hanja, ...mozc]
result = [...new Set(result)]
result = result.map((line) => `${line}\t0\t''\t0\t0\t0`)
comments = comments.map((line) => `-- ${line}`)
fs.writeFileSync('result.txt', [...comments, ...head, ...result].join('\n'))
