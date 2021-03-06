const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const morgan = require('morgan')
const path = require('path')
const bodyParser = require('body-parser')
const userRouter = require('./route/user')
const homeRouter = require('./route/home')
const classifyRouter = require('./route/classify')
const listRouter = require('./route/list')
const detailRouter = require('./route/detail')
const shelfRouter = require('./route/shelf')
const secretOrPrivateKey = require('./utils').secretOrPrivateKey;
// const voiceRouter = require('./route/voice')

// const multipart = require('connect-multiparty');

const app = express();

// 支持跨域
app.use(cors());

// app.use(express.static('./public'));

// app.use(bodyParser.json());

//前端 Content-Type:application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: true
}));

var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' })
app.use(morgan('combined', { stream: accessLogStream }))

//验证Token
const passer = ['/api/home/homeData', '/api/detail/bookDetail', '/api/list/categoryList','/api/list/search', '/api/list/allBookList', '/api/user/register', '/api/user/login','/api/classify/list'];

function auth(req, res, next) {
    const authorization = req.get('Authorization');
    let token = ''
    if (authorization) {
        token = authorization.replace('Bearer ','')
    } else {
        token = authorization
    }
    if (passer.includes(req.path)) {
        next()
    } else {
        jwt.verify(token, secretOrPrivateKey, function (err, decode) {
            if (err) { //  认证出错
                res.json({
                    code: -1,
                    message: '请重新登录'
                });
            } else {
                next();
                console.log(decode);
            }
        })
    }
}
app.use(auth);

app.use('/api/home', homeRouter);
app.use('/api/classify', classifyRouter);
app.use('/api/detail', detailRouter);
app.use('/api/shelf', shelfRouter);
app.use('/api/list', listRouter);
app.use('/api/user', userRouter);
// app.use(voiceRouter);


function not_find_handler_middleware( req, res, next) {
    res.status(404)
        .json({
            message: `api不存在`
        })
}

function error_handler_middleware(err, req, res, next) {
    if (err) {
        let {
            message
        } = err;
        res.status(500)
            .json({
                message: `${message || '服务器异常'}`
            })
    }
}

app.use(not_find_handler_middleware);
app.use(error_handler_middleware);

app.listen(3000, () => {
    console.log('3000端口服务启动')
})