import {User} from "../entities/user";
import {List} from "../entities";

export interface Board {
    collaborators: User[];
    lists: List[];
}