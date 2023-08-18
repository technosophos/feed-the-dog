import { HandleRequest, HttpRequest, HttpResponse, Router, Kv } from "@fermyon/spin-sdk"

const encoder = new TextEncoder()
const router = Router()

async function mainPage(): Promise<HttpResponse> {
  const data = await feedDogN(0);
  return {
    status: 200,
    headers: { "content-type": "text/html" },
    body: "<html><head><title>Feed the Dog</title>\n"
      + '<meta name="viewport" content="width=device-width, initial-scale=1">'
      // Favicons
      + '<link rel="apple-touch-icon" sizes="180x180" href="/static/apple-touch-icon.png">'
      + '<link rel="icon" type="image/png" sizes="32x32" href="/static/favicon-32x32.png">'
      + '<link rel="icon" type="image/png" sizes="16x16" href="/static/favicon-16x16.png">'
      + '<link rel="manifest" href="/static/site.webmanifest">\n'
      // Body
      + '</head><body><h1>Feed the Dog</h1><div><img src="/static/apple-touch-icon.png"></div>'
      + '<p>The dog has been fed <strong>' + data.fed + ' times</strong> today (' + data.date + ')</p></body></html>'
  }
}

function jsonOk(json: Object): HttpResponse {
  return {
    status: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(json),
  }
}

function todaysDate(): string {
  //return "today"
  return (new Date).toLocaleDateString("en-US", { timeZone: "Americas/Denver" }).replace(/\//g, '-')
}

/**
 * Looks up the dogfood feeding info
 * @returns An HTTP response with JSON data
 */
const isDogFed = async function (): Promise<HttpResponse> {
  return jsonOk(await feedDogN(0))
}

/**
 * Feeds the dog and returns the current feeding info
 * @returns An HTTP response with JSON data
 */
const feedDog = async function (): Promise<HttpResponse> {
  return jsonOk(await feedDogN(1))
}

const feedDogN = async function (numTimes: number): Promise<any> {
  let today = todaysDate()
  let store = Kv.openDefault()
  try {
    var record = store.getJson(today)
    // Short circuit if the dog isn't being fed right now.
    if (numTimes > 0) {
      console.log("Updating record by " + numTimes)
      record.fed += numTimes
      store.setJson(today, record)
    }
    return record
  } catch (e: any) {
    console.log("caught error: " + e)
    console.log("creating new record for " + today)
    let newRecord = {
      date: today,
      fed: numTimes,
      treats: 0,
    }
    store.setJson(today, newRecord)
    return newRecord
  }
}

router
  .get("/v1/dog", isDogFed)
  .post("/v1/dog/feed", feedDog)
  .get("/", mainPage)
  .all('*', () => { return { status: 404, body: "Not Found" } })


export const handleRequest: HandleRequest = async function (request: HttpRequest): Promise<HttpResponse> {
  return await router.handleRequest(request)
}
