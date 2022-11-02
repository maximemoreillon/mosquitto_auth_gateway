const express = require('express')
const dotenv = require('dotenv')
const axios = require('axios')
// const apiMetrics = require('prometheus-api-metrics')
const cors = require('cors')
const {version, author} = require('./package.json')
const createHttpError = require('http-errors')
const jwt = require('jsonwebtoken')

dotenv.config()

const {
  APP_PORT = 80,
  IDENTIFICATION_URL = 'http://user-manager/users/self',
  LOGIN_URL = 'http://user-manager/auth/login',
  ADMIN_TOEKN
} = process.env



const app = express()

app.use(cors())
app.use(express.json())
// app.use(apiMetrics())


app.get('/', (req, res) => {
  res.send({
    application_name: 'Mosquitto Auth Gateway',
    author,
    version,
    auth: {
      identification_url: IDENTIFICATION_URL,
      login_url: LOGIN_URL,
      admin_token_set: !!ADMIN_TOEKN
    }
  })
})

const get_user_using_jwt = (jwt) => {
  const headers = { Authorization: `Bearer ${jwt}` }
  return axios.get(IDENTIFICATION_URL, {headers})
}

const login = credentials => axios.post(LOGIN_URL, credentials)

const user_is_superuser = (user) => user.admin
    ?? user.isAdmin
    ?? user.administrator
    ?? user.isAdministrator

const get_user = async (username) => {
  
  const jwtDecodedUsername = jwt.decode(username)
  console.log(jwtDecodedUsername)

  throw createHttpError(501, 'Following not implemented')
}



app.post('/getuser', async (req, res, next) => {

  const {username, password} = req.body

  try {
    if (password === 'jwt') await get_user_using_jwt(username)
    else await login({ username, password })
    res.send('OK')
  } 
  catch (error) {
    next(error)
  }

})


app.post('/superuser', async (req, res, next) => {

  // Note: Body only contains username and thus NOT password
  const { username } = req.body

  console.log('/superuser')
  console.log(req.headers)

  try {
    const user = await get_user({username, password})
    if (!user_is_superuser(user)) throw createHttpError(403, `User is not administrator`)
    res.send('OK')
  } 
  catch (error) {
    console.log('superuser check failed')
    console.log(error.response?.data)
    next(error)
  }

})

app.post('/aclcheck', async (req, res, next) => {

  // req.body.acc: 1 subscribe, 2 publish ??

  // Note: Body does NOT contain password
  const { username, topic, acc} = req.body

  console.log('/aclcheck')
  console.log(req.headers)
  
  try {

    const user = await get_user({ username, password })

    // Only allow users to manipulate topics that contain their username
    if (!topic.startsWith(`/${user.username}/`)) throw createHttpError(403, `User ${user.username} is not allowed to use topic ${topic}`)

    res.send('OK')
  }
  catch (error) {
    console.log('alcheck failed')
    console.log(error.response?.data)
    next(error)
  }


})


app.listen(APP_PORT, () => {
  console.log(`Mosquitto Auth Gateway v${version} listening on port ${APP_PORT}`)
})
