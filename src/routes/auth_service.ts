import { createAuth0Client } from "@auth0/auth0-spa-js";
import config from "../auth_config";

async function createClient(redirect: string) {
  console.log(redirect);
  let auth0Client = await createAuth0Client({
    domain: config.domain,
    clientId: config.clientId,
    authorizationParams: {
      redirect_uri: redirect,
      audience: config.audience,
      scope: "timelogger:read"
    }
  });

  return auth0Client;
}

export default createClient;
