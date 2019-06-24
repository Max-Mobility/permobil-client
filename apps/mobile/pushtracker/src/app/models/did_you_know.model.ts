export class DidYouKnow {
  /**
   * If true then the DidYouKnow is for ALL users of Smart Evaluation.
   * If false, then only permobil employees only.
   */
  all_users: boolean;

  /**
   * The text for the DidYouKnow.
   */
  text: string;

  /**
   * The id of the user who created the DidYouKnow.
   */
  creator_id: string;
  readonly _id: string;
  readonly _acl: any;
  readonly _kmd: any;
}
