const env = require('./env')
const mysql = require('mysql')

let hostName
let resUrl
let mp3FilePath
let dbHost
let dbUser
let dbPwd
if (env == 'dev') {
    hostName: 'http://localhost:3000'
    resUrl = 'http://localhost:8081'
    mp3FilePath = 'E:/porject/Ebook/resouce/mp3'
    dbHost = 'localhost'
    dbUser = 'root'
    dbPwd = 'abc123456'
} else if (env == 'prod') {
    hostName: 'http://120.79.160.241:3000'
    resUrl = 'http://120.79.160.241'
    mp3FilePath = '/root/nginx/upload/mp3'
    dbHost = '120.79.160.241'
    dbUser = 'root'
    dbPwd = '123456'
}

//连接数据库
function connect() {
    return mysql.createConnection({
        host: dbHost,
        user: dbUser,
        password: dbPwd,
        database: 'text'
    })
}

module.exports = {
    hostName,
    resUrl,
    mp3FilePath,
    connect
}