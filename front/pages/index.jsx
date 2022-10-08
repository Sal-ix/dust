import { useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { useSession, signIn, signOut } from "next-auth/react";
import { unstable_getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";
import { ComputerDesktopIcon } from "@heroicons/react/20/solid";
import { Button } from "../components/Button";

export default function Home() {
  return (
    <>
      <Head>
        <title>Dust - LLM Apps Platform</title>
        <link rel="shortcut icon" href="/static/favicon.png" />
      </Head>

      <main className="mx-12">
        <div className="mx-auto max-w-4xl">

          <div className="flex items-center mt-8">
            <div className="flex rotate-[30deg]">
              <div className="bg-gray-400 w-[8px] h-4 rounded-xl"></div>
              <div className="bg-white w-[2px] h-4"></div>
              <div className="bg-gray-400 w-[8px] h-6 rounded-xl"></div>
            </div>
            <div className="bg-white w-[8px] h-4"></div>
            <div className="text-gray-800 font-black text-2xl tracking-tight select-none">
              DUST
            </div>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mt-10">
            <span className="block xl:inline">
              Specification language and design platform for
            </span>{" "}
            <span className="block text-indigo-600 xl:inline">LLM Apps</span>
          </h1>

          <div className="mx-auto mt-5 max-w-md sm:justify-center mt-14">
            <Button
              onClick={() => signIn("github", { callbackUrl: "/api/login" })}
            >
              <ComputerDesktopIcon className="-ml-1 mr-2 h-5 w-5" />
              Sign in with Github
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await unstable_getServerSession(
    context.req,
    context.res,
    authOptions
  );

  return {
    props: { session },
  };
}
