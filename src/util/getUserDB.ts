import {getCognitoUser} from "./getUser";
import {DBPool} from "../database";

export async function getUserDB(token: string) {
    const details = await getCognitoUser(token);
    if(details.UserAttributes) {
        const emailAttribute = details.UserAttributes
            .find(attribute => attribute.Name === 'email');
        const email = emailAttribute?.Value;
        if (email) {
            const userProfilePicture = Math.floor(Math.random() * 5) + 1;
            const { rows } = await DBPool.query(`
                WITH new_user AS (
                    INSERT INTO "Users" ("email", "userProfilePicture")
                        VALUES ($1, $2)
                        ON CONFLICT ("email") DO NOTHING
                        RETURNING "userId"
                )
                SELECT "userId" FROM new_user
                UNION
                SELECT "userId" FROM "Users" WHERE "email" = $1
                LIMIT 1
            `, [email, userProfilePicture]);

            if (rows.length > 0) {
                return rows[0].userId;
            }
        }
        return -1;
    }
}