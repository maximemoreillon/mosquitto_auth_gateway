const express = require('express')
const bodyParser = require('body-parser')
const dotenv = require('dotenv')
const axios = require('axios')
const cors = require('cors')
const pjson = require('./package.json')

dotenv.config()

// Parsing environment variables
const APP_PORT = process.env.APP_PORT || 80
const USER_MANAGER_API_URL = process.env.USER_MANAGER_API_URL
  || process.env.USER_MANAGER_API_URL
  ||  'http://user-manager'
const IDENTIFICATION_URI = process.env.IDENTIFICATION_URI || '/users/self'
const LOGIN_URI = process.env.LOGIN_URI || '/auth/login'

const app = express()

app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.send({
    application_name: 'Mosquitto Auth Gateway',
    version: pjson.version,
    user_manager_api_url:  USER_MANAGER_API_URL
  })
})

function get_user_using_jwt(jwt){
  const url = `${USER_MANAGER_API_URL}${IDENTIFICATION_URI}`
  const headers = { Authorization: `Bearer ${jwt}` }
  return axios.get(url, {headers})
}

function login(credentials){
  const url = `${USER_MANAGER_API_URL}${LOGIN_URI}`
  return axios.post(url, credentials)
}

function user_is_superuser(user){
  return user.properties?.isAdmin
    ?? user.admin
    ?? user.isAdmin
    ?? user.administrator
}

function get_user_id(user){
  return user.identity ?? user._id
}

function get_username(user){
  return user.username ?? user.properties?.username
}

app.post('/getuser', (req, res) => {

  const {username, password} = req.body

  let promise
  if(password === 'jwt') promise = get_user_using_jwt(username)
  else promise = login({username, password})


  promise.then(({data}) => {
    res.send('OK')
    if(password === 'jwt') console.log(`Successful connection from user ${get_username(data)} using JWT`)
    else console.log(`Successful connection from user ${username} using credentials`)
   })
  .catch(error => {
    res.status(403)
    if(error.response) console.log(error.response.data.message)
    else console.log(error)
  })

})

app.post('/superuser', (req, res) => {

  // This only works with JWTs

  const {username} = req.body

  get_user_using_jwt(username)
  .then(({data}) => {

    if(user_is_superuser(data)) {
      console.log(`User is superuser`)
      res.send('OK')
    }
    else {
      console.log(`User is NOT superuser`)
      res.status(403).send('Not OK')
    }

  })
  .catch(error => {
    res.status(403)
    if(error.response) console.log(error.response.data.message)
    else console.log(error)
  })
})

app.post('/aclcheck', (req, res) => {
  // req.body.acc: 1 subscribe, 2 publish ??

  const {username, topic} = req.body


  get_user_using_jwt(username)
  .then(({data}) => {
    const username = get_username(data)

    if(topic.startsWith(`/${username}/`)) {
      console.log(`User ${username} is allowed to use topic ${topic}`)
      res.send('OK')
    }
    else {
      console.log(`User ${username} is NOT allowed to use topic ${topic}`)
      res.status(403).send('Not OK')
    }
  })
  .catch(() => {
    // The user
    if(topic.startsWith(`/${username}/`)) {
      console.log(`User ${username} is allowed to use topic ${topic}`)
      res.send('OK')
    }
    else {
      console.log(`User ${username} is NOT allowed to use topic ${topic}`)
      res.status(403).send('Not OK')
    }
  })
})


app.listen(APP_PORT, () => {
  console.log(`Mosquitto Auth Gateway listening on port ${APP_PORT}`)
})
