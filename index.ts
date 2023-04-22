import express from "express"
import "express-async-errors"
import dotenv from "dotenv"
import axios from "axios"
import apiMetrics from "prometheus-api-metrics"
import cors from "cors"
import { version, author } from "./package.json"
import createHttpError from "http-errors"
import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from "express"

dotenv.config()

const {
  APP_PORT = 80,
  IDENTIFICATION_URL = "http://user-manager/users/self",
  LOGIN_URL = "http://user-manager/auth/login",
} = process.env

const app = express()

app.use(cors())
app.use(express.json())
app.use(apiMetrics())

app.get("/", (req, res) => {
  res.send({
    application_name: "Mosquitto Auth Gateway",
    author,
    version,
    auth: {
      identification_url: IDENTIFICATION_URL,
      login_url: LOGIN_URL,
    },
  })
})

const get_user_using_token = (token: string) => {
  const headers = { Authorization: `Bearer ${token}` }
  return axios.get(IDENTIFICATION_URL, { headers })
}

const login = (credentials: any) => axios.post(LOGIN_URL, credentials)

const user_is_superuser = (user: any) =>
  user.admin ?? user.isAdmin ?? user.administrator ?? user.isAdministrator

app.post("/getuser", async (req, res, next) => {
  // username can be a JWT
  const { username, password } = req.body

  try {
    if (jwt.decode(username)) await get_user_using_token(username)
    else await login({ username, password })
    res.send("OK")
  } catch (error) {
    next(error)
  }
})

app.post("/superuser", async (req, res) => {
  // Note: Body only contains username and thus NOT password
  // Thus, superuser check only works when using JWT and not credentials
  const { username: token } = req.body

  if (!jwt.decode(token)) throw "Username is not token"
  const { data: user } = await get_user_using_token(token)
  if (!user_is_superuser(user))
    throw createHttpError(403, `User is not administrator`)
  res.send("OK")
})

app.post("/aclcheck", async (req, res) => {
  const { username, topic, acc } = req.body
  // Note: Body does NOT contain password
  // However, username can be JWT
  // acc: 1 subscribe, 2 publish ??

  // if username is a JWT, need to get actual username first
  let actualUsername

  try {
    if (!jwt.decode(username)) throw "Username is not token"
    const { data } = await get_user_using_token(username)
    actualUsername = data.username
  } catch (error) {
    actualUsername = username
  }

  // Only allow users to manipulate topics that contain their username
  // NOTE: topic were privosuly starting with '/', which is bad practice
  if (
    !topic.startsWith(`${actualUsername}/`) ||
    !topic.startsWith(`/${actualUsername}/`)
  )
    throw createHttpError(
      403,
      `User ${actualUsername} is not allowed to use topic ${topic}`
    )
  res.send("OK")
})

// Express error handler
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error(error)
  let { statusCode = 500, message = error } = error
  if (isNaN(statusCode) || statusCode > 600) statusCode = 500
  res.status(statusCode).send(message)
})

app.listen(APP_PORT, () => {
  console.log(
    `Mosquitto Auth Gateway v${version} listening on port ${APP_PORT}`
  )
})
