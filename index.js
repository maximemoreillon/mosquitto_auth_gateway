const express = require('express')
const dotenv = require('dotenv')
const axios = require('axios')
const apiMetrics = require('prometheus-api-metrics')
const cors = require('cors')
const {version, author} = require('./package.json')

dotenv.config()

const {
  APP_PORT = 80,
  IDENTIFICATION_URL = 'http://user-manager/v2/users/self',
  LOGIN_URL = 'http://user-manager/v2/auth/login',
} = process.env



const app = express()

app.use(cors())
app.use(express.json())
app.use(apiMetrics())


app.get('/', (req, res) => {
  res.send({
    application_name: 'Mosquitto Auth Gateway',
    author,
    version,
    auth: {
      identification_url: IDENTIFICATION_URL,
      login_url: LOGIN_URL,

    }
  })
})

function get_user_using_jwt(jwt){
  const url = IDENTIFICATION_URL
  const headers = { Authorization: `Bearer ${jwt}` }
  return axios.get(url, {headers})
}

function login(credentials){
  const url = LOGIN_URL
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

  const promise = password === 'jwt' ? get_user_using_jwt(username) : login({ username, password })

  promise.then(({data}) => {
    res.send('OK')
    if(password === 'jwt') console.log(`Successful connection from user ${get_username(data)} using JWT`)
    else console.log(`Successful connection from user ${username} using credentials`)
   })
  .catch(error => {
    res.status(403).send('Not OK')
    if(error.response) console.error(error.response.data.message)
    else console.error(error)
  })

})

app.post('/superuser', (req, res) => {

  // This only works with JWTs

  const {username} = req.body

  get_user_using_jwt(username)
  .then(({data}) => {

    if(user_is_superuser(data)) {
      console.log(`User ${get_username(data)} is superuser`)
      res.send('OK')
    }
    else {
      console.error(`User ${get_username(data)} is NOT superuser`)
      res.status(403).send('Not OK')
    }

  })
  .catch(error => {
    res.status(403).send('Not OK')
    if (error.response) console.error(`Could not determine if user ${username} is superuser: ${error.response.data}`)
    else console.error(error)
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
  .catch(error => {
    res.status(403).send('Not OK')
    if (error.response) console.error(`Could not determine if user ${username} is allowed to use topic ${topic}: ${error.response.data}`)
    else console.error(error)
  })
})


app.listen(APP_PORT, () => {
  console.log(`Mosquitto Auth Gateway v${version} listening on port ${APP_PORT}`)
})
