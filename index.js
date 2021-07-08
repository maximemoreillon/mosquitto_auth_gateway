const express = require('express')
const bodyParser = require('body-parser')
const dotenv = require('dotenv')
const axios = require('axios')
const cors = require('cors')
const pjson = require('./package.json')

dotenv.config()

const app = express()

const APP_PORT = process.env.APP_PORT || 80
const USER_MANAGER_API_URL = process.env.USER_MANAGER_API_URL || 'http://user-manager'

app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.send({
    application_name: 'Mosquitto Auth Gateway',
    version: pjson.version,
    user_manager_api_url:  USER_MANAGER_API_URL
  })
})

function get_user_using_jwt(jwt){
  const url = `${USER_MANAGER_API_URL}/users/self`
  const options = {
    headers: {
      Authorization: `Bearer ${jwt}`
    }
  }
  return axios.get(url, options)
}

function login(credentials){
  const url = `${USER_MANAGER_API_URL}/auth/login`
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

app.post('/getuser', (req, res) => {

  //get_user_using_jwt(req.body.username)
  login(req.body)
  .then(({data}) => {
    //const user_id = get_user_id(data)
    //console.log(`Successful connection from user ${user_id}`)
    console.log(`Successful connection from user ${req.body.username}`)
    res.send('OK')
   })
  .catch(error => {
    console.log(error)
    res.status(403).send(error)
  })

})

app.post('/superuser', (req, res) => {

  console.log('Superuser deactivated')
  res.status(403).send('Not OK')
  // get_user_using_jwt(req.body.username)
  // .then(({data}) => {
  //
  //   const user_id = get_user_id(data)
  //
  //   if(user_is_superuser(data)) {
  //     console.log(`User ${user_id} is superuser`)
  //     res.send('OK')
  //   }
  //   else {
  //     console.log(`User ${user_id} is NOT superuser`)
  //     res.status(403).send('Not OK')
  //   }
  //
  // })
  // .catch(error => {
  //   console.log(error)
  //   res.status(403).send(error)
  // })
})

app.post('/aclcheck', (req, res) => {
  // req.body.acc: 1 subscribe, 2 publish

  const {username} = req.body
  if(topic.startsWith(`/${username}/`)) {
    console.log(`User ${username} is allowed to use topic ${topic}`)
    res.send('OK')
  }
  else {
    console.log(`User ${username} is NOT allowed to use topic ${topic}`)
    res.status(403).send('Not OK')
  }

  // get_user_using_jwt(req.body.username)
  // .then(({data}) => {
  //   const user_id = get_user_id(data)
  //   const {topic} = req.body
  //
  //   if(topic.startsWith(`/${user_id}/`)) {
  //     console.log(`User ${user_id} is allowed to use topic ${topic}`)
  //     res.send('OK')
  //   }
  //   else {
  //     console.log(`User ${user_id} is NOT allowed to use topic ${topic}`)
  //     res.status(403).send('Not OK')
  //   }
  // })
  // .catch(error => {
  //   console.log(error)
  //   res.status(403).send(error)
  // })
})


app.listen(APP_PORT, () => {
  console.log(`Mosquitto Auth Gateway listening on port ${APP_PORT}`)
})
