'use strict';
const express = require('express');
const router = express.Router();
const UserModel = require('./auth/models/Users.js');
const basicAuth = require('./auth/middlewares/basic.js');
const isLogged = require('./auth/middlewares/isLogged');
const bearer = require('./auth/middlewares/bearer.js');
const checkOwner = require('./auth/middlewares/checkOwner');
require('dotenv').config(); //new
const path = require('path'); //new
const googleAuth = require('../src/auth/middlewares/googleAuth'); //new
//googleOauth
const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = process.env.CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);
//new
const uuid = require('uuid').v4;
const Room = require('./auth/models/Room');
const roomValidator = require('./auth/middlewares/roomValidiator');
const { model } = require('mongoose');

router.use(express.static(path.join(__dirname, '../public/broadcast')));

router.post('/signup', async (req, res, next) => {
  try {
    let user = new UserModel(req.body);
    const userRecord = await user.save();
    const output = {
      user: userRecord,
      token: userRecord.token,
    };
    res.redirect('/signin.html');
  } catch (error) {
    next(error.message);
  }
});
let name; //
router.post('/signin', basicAuth, (req, res, next) => {
  const userObject = {
    user: req.user,
    token: req.user.token,
  };
  res.cookie('username', req.user.username); //chat
  // console.log(userObject);
  name = userObject.user.username; //chat
  // console.log('inside router check name',name);
  res.json(userObject);
  // res.send(userObject);
});
router.get('/user', isLogged, (req, res) => {
  const user = {
    user: 'fixed',
  };
  res.status(200).json({ user: user });
});
router.get('/protected', googleAuth, (req, res) => {
  //googleAuth
  res.send('this is protected route');
});
router.get('/secret', bearer, (req, res) => {
  // console.log('hi');
  //  res.send('hi');
  res.json(req.user);
}); //test

router.get('/login', (req, res) => {
  res.sendFile('auth.html', { root: path.join(__dirname, '../public') });
});

router.post('/login', (req, res) => {
  let token = req.body.token;
  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const userid = payload['sub'];
  }
  verify()
    .then(() => {
      res.cookie('session-token', token).redirect ('/profile');
      // res.cookie('session-token', req.token).sendFile('home.html', { root: path.join(__dirname, '../public') });;
      
    })
    .catch(console.error);
  });
  router.get('/profile', googleAuth, (req, res) => {
    let user = req.user;
    // console.log ('this is the paylaod',req.user)
  // console.log(req.cookies['token']);
       

  res.end(); // new
  // res.send(user);
});

// router.get ('/redirect' , (req , res)=>{
//   res.sendFile('home.html', { root: path.join(__dirname, '../public') })
// })


router.get('/logout', (req, res) => {
  res.clearCookie('session-token'); // new
  res.clearCookie('token'); // new
  res.clearCookie('username');
  // res.sendFile('signin.html', { root: path.join(__dirname, '../public') });
  res.redirect('/signin.html');
});


router.get('/', rootHandler);

router.post('/ctreatRoom', isLogged, createRoom);
router.get('/:id', isLogged, roomValidator, checkOwner, roomHandler);

function rootHandler(req, res) {
  res.send('root is working');
  // res.sendFile('index.html', { root: path.join(__dirname, '../public') });;
}
function roomHandler(req, res) {
  // res.sendFile('broadcaster.html', {
  //   root: path.join(__dirname, '../public/broadcast'),
  // });
  // res.render('broadcaster.html');
  console.log ('request params' , req.params)
  req.isOwner
    ? res.sendFile('broadcaster.html', {
        root: path.join(__dirname, '../public/broadcast'),
      })
    : res.sendFile('watcher.html', {
        root: path.join(__dirname, '../public/broadcast'),
      });
}
async function createRoom(req, res) {
  let roomId = uuid();
  console.log(roomId);
  let room = new Room({ roomId: roomId, owner: req.user.username });
  const record = await room.save();
  console.log('record.roomId:', record.roomId, record.owner);
  res.redirect(`/${record.roomId}`);
}
module.exports = router;
