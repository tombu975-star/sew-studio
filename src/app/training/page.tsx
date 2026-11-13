import { permanentRedirect } from "next/navigation";

// Free training now lives in the Sewsiness Academy, on this site.
export default function TrainingPage() {
  permanentRedirect("/academy#live");
}
