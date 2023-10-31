// @ts-check
export default class XRTCommand {
  /**
   * @type {string?}
   */
  type_;

  /**
   * @type {string?}
   */
  argument_;

  /**
   * @param {string} type_
   * @param {string} argument_
   */
  constructor(type_, argument_) {
    this.type_ = type_;
    this.argument_ = argument_;
  }

  /**
  * @return string
  */
  get_type() {
    return this.type_;
  }

  /**
  * @return string
  */
  get_argument() {
    return this.argument_;
  }
}
