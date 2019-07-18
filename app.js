const puppeteer = require('puppeteer');
const mqtt = require('mqtt');
require('dotenv').config();

//mqtt connection
const MQTT_IP_ADDR = process.env.MQTT_HOST;
const MQTT_PORT = process.env.MQTT_PORT;
const MQTT_ADDR = `mqtt://${MQTT_IP_ADDR}:${MQTT_PORT}`;
var client = mqtt.connect(MQTT_ADDR);

const WINDOW_WIDTH = parseInt(process.env.WINDOW_WIDTH)
const WINDOW_HEIGHT = parseInt(process.env.WINDOW_HEIGHT)

//holding the Browser
var browser;
var browserIsOpen = false;

async function startBrowser() {
    browser = await puppeteer.launch({ headless: false, args: ['--start-maximized'] });
    browserIsOpen = true;
}

async function closeBrowser() {
    if (browserIsOpen) {
        await browser.close();
        browserIsOpen = false;
    }
}

async function openNetflix() {
    if (!browserIsOpen) {
        await startBrowser();
    }

    const page = (await browser.pages())[0];
    await page.setViewport({ width: WINDOW_WIDTH, height: WINDOW_HEIGHT });
    await page.goto('https://www.netflix.com/de-en/login', { waitUntil: 'load' });

    if (page.url() !== 'https://www.netflix.com/browse') {
        //login
        await page.type('#id_userLoginId', process.env.NETFLIX_MAIL);
        await page.type('#id_password', process.env.NETFLIX_PASSWD);

        const checkbox = await page.$('#bxid_rememberMe_true');
        checkbox.click();

        const submitBnt = await page.$('.login-button');
        submitBnt.click();

        await page.waitForNavigation({ waitUntil: 'load' });

        //select profile
        const myProfile = await page.$('#appMountPoint > div > div > div > div > div.profiles-gate-container > div > div > ul > li:nth-child(1) > div > a');
        myProfile.click();
    }
}

async function openYoutube() {
    if (!browserIsOpen) {
        await startBrowser();
    }

    const page = (await browser.pages())[0];
    await page.setViewport({ width: WINDOW_WIDTH, height: WINDOW_HEIGHT });
    await page.goto('https://youtube.com', { waitUntil: 'load' });
}




client.on('connect', function () {
    console.log("Connected to " + MQTT_IP_ADDR);
    // Subscribe to the hotword detected topic
    client.subscribe('hermes/hotword/default/detected');
    // Subscribe to intent topic
    client.subscribe('hermes/intent/maxwiese:openNetflix');
    client.subscribe('hermes/intent/maxwiese:openYoutube');
    client.subscribe('hermes/intent/maxwiese:closeBrowser');
});

client.on('message', function (topic, message) {
    if (topic == 'hermes/hotword/default/detected') {
        console.log("Wakeword detected!");
    } else if (topic == 'hermes/intent/maxwiese:openNetflix') {
        console.log(`Intent detected! ${topic}`);
        openNetflix();
    } else if (topic == 'hermes/intent/maxwiese:openYoutube') {
        console.log(`Intent detected! ${topic}`);
        openYoutube();
    }
    else if (topic == 'hermes/intent/maxwiese:closeBrowser') {
        console.log(`Intent detected! ${topic}`);
        closeBrowser();
    }
});
