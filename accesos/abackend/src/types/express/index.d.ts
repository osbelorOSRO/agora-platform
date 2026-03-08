import { User } from "../../interfaces/User.js"; // crea este si querís

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
