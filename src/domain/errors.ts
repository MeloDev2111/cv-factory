/** An expected, user-facing failure. The CLI prints the message without a stack trace. */
export class CvFactoryError extends Error {
  override name = "CvFactoryError";
}
