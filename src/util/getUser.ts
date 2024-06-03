import { CognitoIdentityProviderClient, GetUserCommand } from "@aws-sdk/client-cognito-identity-provider";
const region = 'eu-west-1'; // Replace with your AWS region
const client = new CognitoIdentityProviderClient({ region });

export async function getCognitoUser(token: string){
    const input = {
        AccessToken: token.startsWith('Bearer ') ? token.slice(7) : token
    }
    const command = new GetUserCommand(input);
    try {
        const response = await client.send(command);
        return response;
    } catch (err) {
        throw new Error(`Unable to retrieve user data: ${err}`);
    }
}