const express = require('express')
const db = require('../db')
const fs = require('fs')
const path = require('path')
const formidable = require('formidable')
const avatarFilePath = require('../config').avatarFilePath;
const resUrl = require('../config').resUrl;

const userRouter = express.Router();


//登录
userRouter.post('/login', async (req, res) => {
    const userName = req.body.userName;
    const password = req.body.password;
    const connect = await db.connect();
    const sql = `select * from user where userName="${userName}"`
    connect.query(sql, (err, result) => {
        if (err) {
            console.log(err);
            res.json({
                code: 1,
                msg: '获取失败'
            })
        } else if (result.length == 0) {
            res.json({
                code: 1,
                msg: '用户名或密码错误'
            })
        } else {
            if (result[0].password == password) {
                let user = result[0];
                delete user.password;
                user.loginTime = new Date();
                user.avatar = resUrl + '/user/avatar/' + user.avatar;
                user.avatar =
                    res.json({
                        code: 0,
                        data: user,
                    })
            } else {
                res.json({
                    code: 1,
                    msg: '用户名或密码错误'
                })
            }
        }
        connect.end()
    })
})

//注册
userRouter.post('/register', async (req, res) => {
    const user = req.body;
    if (!user.userName || !user.password) {
        res.json({
            code: 1,
            msg: '用户名或密码不能为空'
        })
        return
    }
    const connect = await db.connect();
    const queryByName = `select * from user where userName="${user.userName}"`
    const insert = `INSERT INTO user SET ?`
    connect.query(queryByName, user, (err, result) => {
        if (err) {
            res.json({
                code: 1,
                msg: '注册失败'
            })
        } else {
            if (result.length > 0) {
                res.json({
                    code: 1,
                    msg: '用户名已存在'
                })
            } else {
                connect.query(insert, user, (err, result) => {
                    if (err) {
                        console.log(err);
                        res.json({
                            code: 1,
                            msg: '插入数据失败'
                        })
                    } else {
                        res.json({
                            code: 0,
                            msg: '注册成功'
                        })
                    }
                })
            }
        }
        connect.end()
    })
})

//更改用户信息
userRouter.post('/updata', async (req, res) => {
    const user = req.body;
    const connect = await db.connect();
    const queryById = `select * from user where id="${user.id}"`
    const updata = `update user set ? where id="${user.id}"`
    connect.query(queryById, user.id, (err, result) => {
        if (err) {
            console.log(err);
            res.json({
                code: 1,
                msg: '更改失败'
            })
        } else {
            if (result.length > 0) {
                let newData = result[0]
                Object.assign(newData, user)
                connect.query(updata, newData, (err, result) => {
                    if (err) {
                        console.log(err);
                        res.json({
                            code: 1,
                            msg: '更改失败'
                        })
                    } else {
                        delete newData.password
                        newData.loginTime = new Date();
                        newData.avatar = resUrl + '/user/avatar/' + user.avatar;
                        res.json({
                            code: 0,
                            data: newData,
                            msg: '更改成功'
                        })
                    }
                })
            } else {
                res.json({
                    code: 1,
                    msg: '没有找到用户'
                })
            }
        }
        connect.end();
    })
})


//更换头像
userRouter.post('/avatar/:userId', async (req, res) => {
    const userId = req.params.userId;
    const connect = await db.connect();
    //上传文件只能通过这个插件接收  file是上传文件 fields是其他的
    const form = new formidable.IncomingForm();
    form.uploadDir = path.join(__dirname, '../upload'); //文件保存的临时目录为static文件夹（文件夹不存在会报错，一会接受的file中的path就是这个）
    form.maxFieldsSize = 1 * 1024 * 1024; //用户头像大小限制为最大1M
    form.keepExtensions = true; //使用文件的原扩展名  
    form.parse(req, (err, fields, file) => {
        let filePath = '';
        //如果提交文件的form中将上传文件的input名设置为tmpFile，就从tmpFile中取上传文件。否则取for in循环第一个上传的文件。  
        if (file.tmpFile) {
            filePath = file.tmpFile.path;
        } else {
            for (let key in file) {
                if (file[key].path && filePath === '') {
                    filePath = file[key].path;
                    break;
                }
            }
        }
        //文件移动的目录文件夹，不存在时创建目标文件夹  
        let targetDir = avatarFilePath;
        // let targetDir = path.join(__dirname, '../public');
        if (!fs.existsSync(targetDir)) {
            fs.mkdir(targetDir);
        }
        //获取文件后缀名
        const fileExt = filePath.substring(filePath.lastIndexOf('.'));
        //判断文件类型是否允许上传  
        if (('.jpg.jpeg.png.gif').indexOf(fileExt.toLowerCase()) === -1) {
            const err = new Error('此文件类型不允许上传');
            res.json({
                code: -1,
                message: '此文件类型不允许上传'
            });
        } else {
            //以当前时间戳对上传文件进行重命名  
            const fileName = userId + '_' + new Date().getTime() + fileExt;
            const targetFile = path.join(targetDir, fileName);

            const queryById = `select * from user where id="${userId}"`
            const updata = `update user set avatar="${fileName}" where id="${userId}"`

            connect.query(queryById, (err, result) => {
                if (err) {
                    console.log(err);
                    res.json({
                        code: 1,
                        msg: '获取失败'
                    })
                } else {
                    if (result.length > 0) {
                        //旧头像文件名
                        const oldAvatar = result[0].avatar;

                        //移动文件 (旧文件名，新文件名，回调函数) 
                        fs.rename(filePath, targetFile, (err) => {
                            if (err) {
                                console.info(err);
                                res.json({ code: 1, msg: '操作失败' });
                            }
                        });

                        //上传成功，返回文件的相对路径  
                        let fileUrl = resUrl + '/user/avatar/' + fileName;
                        connect.query(updata, (err, result) => {
                            if (err) {
                                console.log(err);
                                res.json({
                                    code: 1,
                                    msg: '获取失败'
                                })
                            } else {
                                res.json({
                                    fileUrl,
                                    code: 0,
                                    msg: '更换成功'
                                });
                            }
                        })

                        //删除旧的头像文件
                        if (oldAvatar && oldAvatar !== 'avatar.png') {
                            fs.unlink(targetDir + '/' + oldAvatar, (err) => {
                                if (err) {
                                    console.info(err);
                                    res.json({ code: 1, msg: '操作失败' });
                                }
                            })
                        }

                    } else {
                        res.json({
                            code: 1,
                            msg: '获取失败'
                        })
                    }
                }
                connect.end()
            })
        }
    });
})

module.exports = userRouter