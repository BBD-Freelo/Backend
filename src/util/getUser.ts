import {CognitoIdentityProviderClient, GetUserCommand} from "@aws-sdk/client-cognito-identity-provider";

const region = 'eu-west-1';
const client = new CognitoIdentityProviderClient({ region });

export async function getCognitoUser(token: string) {
    const input = {
        AccessToken: token.startsWith('Bearer ') ? token.slice(7) : token
    }
    const command = new GetUserCommand(input);
    try {
        return await client.send(command);
    } catch (err) {
        throw new Error(`Unable to retrieve user data: ${err}`);
    }
}