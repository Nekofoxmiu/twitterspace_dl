'use strict';

import axios from "axios";
import child_process from "child_process";
import GetQueryId from "./GetQueryId.js";
import fs from "fs";
import * as path from 'path';
import { fileURLToPath } from 'url';

class TwitterSpace {
    constructor(cookie, configObj = {}) {
        this.cookie = cookie;
        this.rootFolder = `${path.dirname(fileURLToPath(import.meta.url))}`;
        this.guestToken = "";
        this.UserByScreenNameQraphl = {};
        this.UserByRestIdQraphl = {};
        this.AudioSpaceByIdQraphl = {};
        this.configObj = Object.assign({
            record: true,
            outputPath: path.resolve(this.rootFolder, '..', '..'),
            searchByName: true,
            saveIds: false
        }, configObj);
        this.botConfig = {
            TwitterAuthToken: this.cookie.auth,
            TwitterCSRFToken: this.cookie.ct0
        };
        this.getQueryId = new GetQueryId(this.botConfig);

        this.twitterSpaceAxios = axios.create({
            withCredentials: true,
            headers: {
                'Authorization': "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36',
            },
            timeout: 10000,
            retry: 10,
            retryDelay: 1000
        });

        
        this.twitterSpaceAxios.interceptors.response.use(undefined, async (err) => {
            return this.retryInterceptor(err);
        });
        



    }


    async retryInterceptor(err) {
        try {
            console.log(err.config)
            const config = err.config;
            if (!config || !config.retry) return Promise.reject(err?.response?.data);

            let delay_pow = config.__retryCount >= 7 ? 7 : config.__retryCount;
            const backOffDelay = config.retryDelay ? (((1 / 2) * (Math.pow(2, delay_pow) - 1)) * 1000) : 1;

            config.__retryCount = config.__retryCount || 0;
            if (config.__retryCount >= config.retry) return Promise.reject(err?.response?.data);

            config.__retryCount += 1;

            let backoff = new Promise(resolve => setTimeout(resolve, backOffDelay));

            if (err.response) {
                if (err.response.status === 403 && config.headers["x-guest-token"]) {
                    const response = await this.getGuestToken(true);
                    config.headers["x-guest-token"] = response;
                    this.guestToken = response;
                }

                if (err.response.status === 404 && config.url && (config.url).match(/UserByScreenName|AudioSpaceById|UserByRestId/)) {
                    const updatedQueries = await this.updateQueryIds();
                    this.replaceQueryIds(config, updatedQueries);
                }
            }

            await backoff;
            return await this.twitterSpaceAxios(config);
        } catch (err) {
            console.log(err);
        }
    }

    async updateQueryIds() {
        try {
            await this.getQueryId.tryUpdate();
            this.UserByScreenNameQraphl = await this.getQueryId.getQueryIdAndToken('UserByScreenName');
            this.UserByRestIdQraphl = await this.getQueryId.getQueryIdAndToken('UserByRestId');
            this.AudioSpaceByIdQraphl = await this.getQueryId.getQueryIdAndToken('AudioSpaceById');
            return { UserByScreenNameQraphl: this.UserByScreenNameQraphl, UserByRestIdQraphl: this.UserByRestIdQraphl, AudioSpaceByIdQraphl: this.AudioSpaceByIdQraphl };
        } catch (err) {
            console.error('Updated Qraphl List fail.', err);
        }
    }

    replaceQueryIds(config, updatedQueries) {
        const { UserByScreenNameQraphl, UserByRestIdQraphl, AudioSpaceByIdQraphl } = updatedQueries;
        if (config.url.match(/UserByScreenName/)) config.url = config.url.replace(/(?<=api\/graphql\/).+(?=\/UserByScreenName)/, UserByScreenNameQraphl.queryId);
        if (config.url.match(/UserByRestId/)) config.url = config.url.replace(/(?<=api\/graphql\/).+(?=\/UserByRestId)/, UserByRestIdQraphl.queryId);
        if (config.url.match(/AudioSpaceById/)) {
            config.url = config.url.replace(/(?<=api\/graphql\/).+(?=\/AudioSpaceById)/, AudioSpaceByIdQraphl.queryId)
                .replace(/(?<=\&features\=).+/, this.featuresStringBuilder(AudioSpaceByIdQraphl.queryToken));
        }
    }

    async getGuestToken(forceUpdate = false) {
        const tokenPath = path.join(this.rootFolder, '..', 'data_json', 'Token.json');
        if (!forceUpdate) {
            try {
                const tokenData = JSON.parse(fs.readFileSync(tokenPath));
                return tokenData.guestToken;
            } catch (err) {
                console.log('Token.json 讀取失敗，將嘗試重新獲取 token。');
            }
        }

        try {
            const response = await axios.post("https://api.twitter.com/1.1/guest/activate.json", {}, {
                headers: {
                    "authorization": `Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA`,
                }
            });
            const guestToken = response.data.guest_token;
            fs.writeFileSync(tokenPath, JSON.stringify({ guestToken }));
            return guestToken;
        } catch (err) {
            console.error('獲取 x-guestToken 失敗：', err.message);
            throw err;
        }
    }

    featuresStringBuilder(Feature) {
        let outputFeatures = {};
        for (let i = 0; (Feature).length > i; i++) {
            outputFeatures[(Feature)[i]] = false;
        }
        return encodeURIComponent(JSON.stringify(outputFeatures));
    }

    async createFfmpeg(whoseSpace, Spacem3u8, output, checktime, waitms) {
        let checkStart = false;
        try {
            console.log(output);
            for (let checkspawn = 0, checkclose = 0, i = 0; i < checktime; i++) {
                const ffmpeg = child_process.exec(`ffmpeg.exe -i ${Spacem3u8} -y -vn -c:a copy ${output} `, { cwd: `${this.rootFolder}\\..\\..` }, (error) => {
                    if (error) {
                        //console.error(error);
                    }
                });

                ffmpeg.on('spawn', () => { checkspawn++; });
                ffmpeg.on('close', (code) => {
                    if (code === 1 && code !== 0) {
                        console.log(`Success get m3u8 but it still empty. Retry...(${i + 1}/${checktime})`);
                        checkclose++;
                    }
                });
                await this.wait(waitms);
                if (checkspawn !== checkclose) {
                    checkStart = true;
                    break;
                }
            }
        } catch (err) {
            throw new Error(err);
        }
        if (checkStart) {
            console.log(`${whoseSpace}'s space start recording.`);
            return 0;
        } else {
            throw new Error("Download fail.");
        }
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(() => resolve(), ms));
    }

    async getUserIdByName(whoseSpace) {
        if (!this.UserByScreenNameQraphl.queryId) await this.updateQueryIds();

        let res = this.twitterSpaceAxios(`https://twitter.com/i/api/graphql/${this.UserByScreenNameQraphl.queryId}/UserByScreenName?variables=` + encodeURIComponent(JSON.stringify({
            "screen_name": `${whoseSpace}`
        })) +
            "&features=" + this.featuresStringBuilder(this.UserByScreenNameQraphl.queryToken), {
            headers: {
                "cookie": `auth_token=${this.cookie.auth}; ct0=${this.cookie.ct0}`,
                "x-csrf-token": this.cookie.ct0,
            },
            method: "GET"
        })
            .then(response => response.data.data.user.result.rest_id)
            .catch(err => { throw new Error('get userId from screenName fail.', err); });

            return res;
    }

    async getUserNameById(userId) {
        if (!this.UserByRestIdQraphl.queryId) await this.updateQueryIds();

        return this.twitterSpaceAxios(`https://twitter.com/i/api/graphql/${this.UserByRestIdQraphl.queryId}/UserByRestId?variables=` + encodeURIComponent(JSON.stringify({
            "userId": `${userId}`
        })) +
            "&features=" + this.featuresStringBuilder(this.UserByRestIdQraphl.queryToken), {
            headers: {
                "cookie": `auth_token=${this.cookie.auth}; ct0=${this.cookie.ct0}`,
                "x-csrf-token": this.cookie.ct0,
            },
            method: "GET"
        })
            .then(response => response.data.data.user.result.legacy.screen_name)
            .catch(err => { throw new Error('get ScreenName from userId fail.', err); });
    }

    async getSpaceId(userId) {
        let retryCount = 0;
        let spaceId = null;

        while (retryCount < 10) {
            try {
                const response = await this.twitterSpaceAxios("https://twitter.com/i/api/fleets/v1/avatar_content?user_ids=" + userId + "&only_spaces=true", {
                    headers: {
                        "cookie": `auth_token=${this.cookie.auth}; ct0=${this.cookie.ct0}`,
                        "x-csrf-token": this.cookie.ct0,
                    },
                    method: "GET"
                });

                if (this.ToStrKillQuote(response?.data?.users) === "{}") {
                    throw new Error("Twitter space is not open.");
                }

                spaceId = this.ToStrKillQuote(response?.data?.users[`${userId}`]?.spaces?.live_content?.audiospace?.broadcast_id);
                break;
            } catch (error) {
                retryCount++;
                await this.wait(10000);
            }
        }

        return spaceId;
    }

    ToStrKillQuote(jsonData) {
        return JSON.stringify(jsonData).replace(/\"/g, "");
    }

    async getSpaceData(spaceId) {
        if (!this.AudioSpaceByIdQraphl.queryId) await this.updateQueryIds();

        const response = await this.twitterSpaceAxios(
            `https://twitter.com/i/api/graphql/${this.AudioSpaceByIdQraphl.queryId}/AudioSpaceById?variables=` + encodeURIComponent(JSON.stringify({
                "id": spaceId,
                "isMetatagsQuery": false,
                "withReplays": true,
                "withListeners": true
            })) + "&features=" + this.featuresStringBuilder(this.AudioSpaceByIdQraphl.queryToken), {
            headers: {
                "cookie": `auth_token=${this.cookie.auth}; ct0=${this.cookie.ct0};`,
                "x-csrf-token": this.cookie.ct0,
            },
            method: "GET"
        });

        return response.data.data.audioSpace;
    }

    async getM3u8(broadcastId) {
        const response = await this.twitterSpaceAxios("https://twitter.com/i/api/1.1/live_video_stream/status/" + broadcastId + "?client=web&use_syndication_guest_id=false&cookie_set_host=twitter.com", {
            headers: {
                "x-guest-token": await this.getGuestToken(),
            },
            method: "GET"
        });

        return this.ToStrKillQuote(response.data.source.location);
    }

    async execute(whoseSpace) {
        try {
            await this.updateQueryIds();

            let userId = "";

            if (this.configObj.searchByName) {
                userId = await this.getUserIdByName(whoseSpace);
            } else {
                userId = whoseSpace;
                whoseSpace = await this.getUserNameById(userId);
            }

            const spaceId = await this.getSpaceId(userId);
            const spaceData = await this.getSpaceData(spaceId);
            const broadcastId = this.ToStrKillQuote(spaceData.metadata.media_key);
            const broadcastTitle = this.ToStrKillQuote(spaceData.metadata.title);

            let Spacem3u8 = await this.getM3u8(broadcastId);

            let outputBroadcastTitle = broadcastTitle.replace(/[<>:;,?"*|/\\]/g, "").replace(/\s/g, "_");
            let output = `${this.configObj.outputPath}\\${whoseSpace}_${this.GetTime(spaceData.metadata.started_at)}_${outputBroadcastTitle}.m4a`;

            if (this.configObj.record) {
                await this.createFfmpeg(whoseSpace, Spacem3u8, output, 15, 1000);
            }

            return {
                title: broadcastTitle,
                m3u8: Spacem3u8,
                name: whoseSpace,
                id: userId,
                spaceId: spaceId,
                broadcastId: broadcastId,
                spaceData: spaceData,
                userData: await this.getUserData(userId)
            };

        } catch (err) {
            if (err.message === "Twitter space is not open.") {
                return 2;
            }
            else {
                console.error(err);
                return -1;
            }
        }
    }

    async getUserData(userId) {
        if(!this.UserByRestIdQraphl.queryId) await this.updateQueryIds();

        return await this.twitterSpaceAxios(`https://twitter.com/i/api/graphql/${this.UserByRestIdQraphl.queryId}/UserByRestId?variables=` + encodeURIComponent(JSON.stringify({
            "userId": `${userId}`,
            "withSafetyModeUserFields": true,
            "withSuperFollowsUserFields": true
        })) +
            "&features=" + this.featuresStringBuilder(this.UserByRestIdQraphl.queryToken), {
            headers: {
                "cookie": `auth_token=${this.cookie.auth}; ct0=${this.cookie.ct0}`,
                "x-csrf-token": this.cookie.ct0,
            },
            method: "GET"
        })
            .then(response => response.data.data.user.result)
            .catch(err => { throw new Error('get userId from screenName fail.'); });
    }


    GetTime(unixtime) {
        let today = unixtime ? new Date(unixtime) : new Date();
        let month = today.getMonth() + 1 < 10 ? '0' + (today.getMonth() + 1) : today.getMonth() + 1;

        const AddZero = time => time < 10 ? '0' + time : time;

        return `${today.getFullYear()}${month}${AddZero(today.getDate())}_${AddZero(today.getHours())}_${AddZero(today.getMinutes())}`;
    }
}

export default TwitterSpace;
