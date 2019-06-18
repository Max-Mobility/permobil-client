export class DemoRequest {
  _id: string;
  /**
   * When creating a request, the user can input contact information which helps the user providing the demo unit know who to contact.
   */
  contact_info: string;

  /**
   * When a demo request is complete, the rep will mark it complete.
   */
  complete: boolean;

  /**
   * The rep who "claimed" the demo request. This will flag the record so data can be filtered.
   */
  claimed_user: string;

  /**
   * User requesting the demo.
   */
  user: string;

  /**
   * Location of the user requesting demo. Useful to determine the distance radius for sending push notifications.
   */
  _geoloc: [number, number];

  /**
   * Max Distance in miles to contact reps via push notification that a demo has been requested.
   */
  maxDistance: number;
}
