const express = require('express')
const bodyParser = require('body-parser')
const dotenv = require('dotenv')
const axios = require('axios')
const cors = require('cors')
const pjson = require('./package.json')

dotenv.config()

const app = express()

const APP_PORT = process.env.APP_PORT || 80
const AUTHENTICATION_API_URL = process.env.AUTHENTICATION_API_URL || 'http://authentication'

app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.send({
    application_name: 'Mosquitto Auth Gateway',
    version: pjson.version,
    authentication_api_url:  AUTHENTICATION_API_URL
  })
})

function get_user_using_jwt(jwt){
  const url = `${AUTHENTICATION_API_URL}/v2/whoami`
  const options = {
    headers: {
      Authorization: `Bearer ${jwt}`
    }
  }
  return axios.get(url, options)
}

function user_is_superuser(user){
  return user.properties?.isAdmin
    ?? user.admin
    ?? user.isAdmin
}

function get_user_id(user){
  return user.identity ?? user._id
}

app.post('/getuser', (req, res) => {

  get_user_using_jwt(req.body.username)
  .then(({data}) => {
    const user_id = get_user_id(data)
    console.log(`Successful connection from user ${user_id}`)
    res.send('OK')
   })
  .catch(error => {
    console.log(error)
    res.status(403).send(error)
  })

})

app.post('/superuser', (req, res) => {
  get_user_using_jwt(req.body.username)
  .then(({data}) => {

    const user_id = get_user_id(data)

    if(user_is_superuser(data)) {
      console.log(`User ${user_id} is superuser`)
      res.send('OK')
    }
    else {
      console.log(`User ${user_id} is NOT superuser`)
      res.status(403).send('Not OK')
    }

  })
  .catch(error => {
    console.log(error)
    res.status(403).send(error)
  })
})

app.post('/aclcheck', (req, res) => {
  // req.body.acc: 1 subscribe, 2 publish
  get_user_using_jwt(req.body.username)
  .then(({data}) => {
    const user_id = get_user_id(data)
    const {topic} = req.body

    if(topic.startsWith(`/${user_id}/`)) {
      console.log(`User ${user_id} is allowed to use topic ${topic}`)
      res.send('OK')
    }
    else {
      console.log(`User ${user_id} is NOT allowed to use topic ${topic}`)
      res.status(403).send('Not OK')
    }
  })
  .catch(error => {
    console.log(error)
    res.status(403).send(error)
  })
})


app.listen(APP_PORT, () => {
  console.log(`Mosquitto Auth Gateway listening on port ${APP_PORT}`)
})
