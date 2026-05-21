import axios, { AxiosInstance, AxiosResponse } from 'axios';


export class JiraClient {
  private client: AxiosInstance;

  constructor() {
    const baseURL = (process.env.JIRA_BASE_URL! || '').replace(/\/+$/, '');
    const token = process.env.JIRA_API_TOKEN!;
    const email = process.env.JIRA_EMAIL!;
    const auth = Buffer.from(`${email}:${token}`).toString('base64');


    // ANSI color codes for console
    const CYAN = '\x1b[36m';
    const GREEN = '\x1b[32m';
    const RED = '\x1b[31m';
    const RESET = '\x1b[0m';

    this.client = axios.create({
      baseURL,
      timeout: 30_000,
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'X-Atlassian-Token': 'no-check',
      },
      // withCredentials not required for Basic auth; add if cookie support is later needed
    });

    // Request logger: full request (method, full url, headers, cookies, params, body)
/*     this.client.interceptors.request.use(
      (config) => {
        try {
          const method = (config.method || 'GET').toUpperCase();
          // build full URL including baseURL and params
          const base = config.baseURL ? config.baseURL.replace(/\/+$/, '') : '';
          const path = config.url ? config.url.replace(/^\/+/, '') : '';
          const fullUrl = base ? `${base}/${path}` : path || '';
          console.log(CYAN + '\n======= DEBUG REQUEST =======');
          console.log(`${method} ${fullUrl}`);
          // headers
          console.log('Headers:');
          try {
            console.log(JSON.stringify(config.headers ?? {}, null, 2));
          } catch {
            console.log(config.headers);
          }
          // cookie header explicit
          const cookieHeader = (config.headers && (config.headers['Cookie'] || config.headers['cookie'])) ?? undefined;
          if (cookieHeader) console.log('Cookie:', cookieHeader);
          // params
          if (config.params && Object.keys(config.params).length > 0) {
            console.log('Query Params:');
            console.log(JSON.stringify(config.params, null, 2));
          }
          // body/data
          if (typeof config.data !== 'undefined') {
            console.log('Request Body:');
            try {
              console.log(JSON.stringify(config.data, null, 2));
            } catch {
              console.log(config.data);
            }
          }
          console.log('=============================\n');
        } catch (err) {
          console.log('Failed to log request', err);
        }
        return config;
      },
      (error) => {
        console.log('Request error:', error);
        return Promise.reject(error);
      }
    ); */

/*     // Response logger: status, headers, cookies, body (attempt JSON)
    this.client.interceptors.response.use(
      (resp) => {
        try {
          console.log(GREEN + '\n======= DEBUG RESPONSE =======');
          console.log(`HTTP ${resp.status} ${resp.statusText} -> ${resp.config.url}`);
          console.log('Response Headers:');
          try {
            console.log(JSON.stringify(resp.headers ?? {}, null, 2));
          } catch {
            console.log(resp.headers);
          }
          const setCookie = resp.headers && (resp.headers['set-cookie'] || resp.headers['Set-Cookie']);
          if (setCookie) console.log('Set-Cookie:', setCookie);
          console.log('Response Body:');
          try {
            console.log(JSON.stringify(resp.data, null, 2));
          } catch {
            console.log(resp.data);
          }
          console.log('==============================\n');
        } catch (err) {
          console.log('Failed to log response', err);
        }
        return resp;
      },
      (err) => {
        try {
          if (err.response) {
            console.log(RED + '\n======= DEBUG ERROR RESPONSE =======');
            console.log(`HTTP ${err.response.status} ${err.response.statusText} -> ${err.config?.url}`);
            try {
              console.log(JSON.stringify(err.response.headers ?? {}, null, 2));
            } catch {
              console.log(err.response.headers);
            }
            try {
              console.log(JSON.stringify(err.response.data ?? {}, null, 2));
            } catch {
              console.log(err.response.data);
            }
            console.log('====================================\n');
          } else {
            console.log('Network/Error without response:', err.message || err);
          }
        } catch (e) {
          console.log('Failed to log error response', e);
        }
        return Promise.reject(err);
      }
    ); */
  }


  async getMyself(): Promise<AxiosResponse> {
    // GET /rest/api/3/myself
    return this.client.get('/rest/api/3/myself');
  }

  async getFilter(filterId: string): Promise<AxiosResponse> {
    // GET /rest/api/3/filter/{id}
    return this.client.get(`/rest/api/3/filter/${encodeURIComponent(filterId)}`);
  }




  async searchJQL(jql: string, fields?: string[], nextPageToken?: string, maxResults = 100): Promise<AxiosResponse> {
    const body: Record<string, any> = { jql, maxResults };
    if (fields && fields.length) body.fields = fields;
    if (nextPageToken) body.nextPageToken = nextPageToken;

    // POST /rest/api/3/search/jql (returns issues + nextPageToken/isLast)
    return this.client.post('/rest/api/3/search/jql', body);
  }

async getAllIssues(jql: string, fields?: string[], maxResults = 100) {
    const all: any[] = [];
    let nextPageToken: string | undefined = undefined;
    let isLast = false;

    while (!isLast) {
      const resp = await this.searchJQL(jql, fields, nextPageToken, maxResults);
      if (resp.status !== 200) throw new Error(`Jira search failed: ${resp.status}`);

      const data = resp.data;
      const issues = Array.isArray(data.issues) ? data.issues : [];
      all.push(...issues);

      // update pagination state
      nextPageToken = typeof data.nextPageToken === 'string' && data.nextPageToken.length > 0 ? data.nextPageToken : undefined;
      isLast = data.isLast === true;

      // safety: if no token and not explicitly isLast, break to avoid infinite loop
      if (!nextPageToken && !isLast) break;
    }

    return all;
  }


}