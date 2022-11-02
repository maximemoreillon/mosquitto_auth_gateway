const express = require('express')
const dotenv = require('dotenv')
const axios = require('axios')
// const apiMetrics = require('prometheus-api-metrics')
const cors = require('cors')
const {version, author} = require('./package.json')
const createHttpError = require('http-errors')

dotenv.config()

const {
  APP_PORT = 80,
  IDENTIFICATION_URL = 'http://user-manager/users/self',
  LOGIN_URL = 'http://user-manager/auth/login',
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

    }
  })
})

const get_user_using_jwt = (jwt) => {
  const headers = { Authorization: `Bearer ${jwt}` }
  return axios.get(IDENTIFICATION_URL, {headers})
}

const login = credentials => axios.post(LOGIN_URL, credentials)


function user_is_superuser(user){
  return user.admin
    ?? user.isAdmin
    ?? user.administrator
    ?? user.isAdministrator
}


function get_username(user){
  return user.username ?? user.properties?.username
}

app.post('/getuser', async (req, res, next) => {

  const {username, password} = req.body

  try {
    if (password === 'jwt') {
      console.log(`User is trying to authenticate using jwt`)
      await get_user_using_jwt(username)
      console.log(`Successful auth using JWT`)
    }
    else {
      console.log(`User is trying to authenticate using credentials, with username being ${username}`)
      await login({ username, password })
      console.log(`Successful auth using credentials`)
    }

    res.send('OK')
  } catch (error) {
    next(error)
  }

})

app.post('/superuser', async (req, res, next) => {

  const { username, password } = req.body

  let user

  // This is ugly and needs refactoring
  try {
    if (password === 'jwt') {
      console.log(`Checking if administrator via JWT`)
      const { data } = await get_user_using_jwt(username)
      console.log(`JWT is valid`)
      user = data

    }
    else {
      console.log(`Checking if administrator using credentials, with username being ${username}`)

      const { data: { jwt } } = await login({ username, password })
      console.log(`Successful auth using credentials`)

      console.log(`Retrieving user information of user ${username} via JWT`)
      const { data } = await get_user_using_jwt(jwt)
      user = data

    }

    if (!user_is_superuser) throw createHttpError(403, `User is not administrator`)
    console.log(`User is indeed an administrator`)

    res.send('OK')
  } 
  catch (error) {
    next(error)
  }

})

app.post('/aclcheck', async (req, res, next) => {
  // req.body.acc: 1 subscribe, 2 publish ??
  // Only seems to work with JWTS

  const { username, password, topic} = req.body

  let user

  // This is ugly and needs refactoring
  try {

    if (password === 'jwt') {
      console.log(`Checking if administrator via JWT`)
      const { data } = await get_user_using_jwt(username)
      console.log(`JWT is valid`)
      user = data

    }
    else {
      console.log(`Checking if administrator using credentials, with username being ${username}`)

      const { data: { jwt } } = await login({ username, password })
      console.log(`Successful auth using credentials`)

      console.log(`Retrieving user information of user ${username} via JWT`)
      const { data } = await get_user_using_jwt(jwt)
      user = data

    }

    const username = get_username(data)

    // Only allow users to manipulate topics that contain their username
    if (topic.startsWith(`/${username}/`)) {
      console.log(`User ${username} is allowed to use topic ${topic}`)
      res.send('OK')
    }
    else {
      console.log(`User ${username} is NOT allowed to use topic ${topic}`)
      res.status(403).send('Not OK')
    }

    console.log(`User is indeed an administrator`)

    res.send('OK')
  }
  catch (error) {
    next(error)
  }


})


app.listen(APP_PORT, () => {
  console.log(`Mosquitto Auth Gateway v${version} listening on port ${APP_PORT}`)
})
