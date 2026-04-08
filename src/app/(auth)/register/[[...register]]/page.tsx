import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return <RegisterForm />;
}
