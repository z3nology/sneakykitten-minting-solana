/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useContext } from "react";
import Link from "next/link";
import axios from "axios";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletContextState } from "@solana/wallet-adapter-react";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { FadeLoader } from "react-spinners";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { MintInfoContext } from "../contexts/MintInfoProvider";

import {
  CONTRACTADDR,
  MAX_MINTAMOUNT_PERTX,
  MAX_SUPPLY,
  MINT_PRICE,
  rpcUrl,
} from "../config";

import * as ToastGroup from "../components/ToastGroup";

export default function Mint() {
  const imgList = ["img/anim1.png", "img/anim2.png", "img/anim3.png"];
  const { totalSupply, getMintInfo } = useContext(MintInfoContext);
  const [loading, setLoading] = useState<boolean>(false);
  const [mintCount, setMintCount] = useState(1);
  const [turn, setTurn] = useState(0);
  const wallet = useWallet();

  useEffect(() => {
    const interval = setInterval(() => {
      setTurn((prevTurn) => (prevTurn === 2 ? 0 : prevTurn + 1));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const handleMintWithPhantom = async (
    connection: Connection,
    wallet: WalletContextState,
    totalToMint: number
  ) => {
    setLoading(true);
    try {
      if (!wallet.publicKey) {
        ToastGroup.warningAlert("Please Connect wallet!");
      } else {
        setLoading(true);
        const blockhash = await connection.getLatestBlockhash();
        const tx = new Transaction().add(
          solInstruction(
            wallet?.publicKey,
            new PublicKey(CONTRACTADDR),
            +(MINT_PRICE * totalToMint).toFixed(4)
          )
        );
        tx.feePayer = wallet?.publicKey;
        tx.recentBlockhash = blockhash.blockhash;
        let signedTx;
        if (wallet.signTransaction !== undefined) {
          signedTx = await wallet.signTransaction(tx);
          let txId = await connection.sendRawTransaction(signedTx.serialize(), {
            skipPreflight: true,
            maxRetries: 3,
            preflightCommitment: "confirmed",
          });
          await connection.confirmTransaction(txId, "confirmed");
          const confirmed = await axios.post(
            `https://sol.sneakylabs.art/user/mintart/`,
            {
              hash: txId,
            },
            {
              validateStatus: () => true,
            }
          );
          if (confirmed.data.error || confirmed.status !== 200) {
            ToastGroup.errorAlert(
              `Error!${confirmed.data.error ? ` ${confirmed.data.error}` : ""}`
            );
          } else {
            if (confirmed.data?.message === "0 NFT minted") {
              ToastGroup.errorAlert(
                `Error! Something went wrong minting your NFT.`
              );
            } else {
              ToastGroup.successAlert(
                "Minting Now... you'll get your nft within 2 mins."
              );
              await getMintInfo();
            }
            setLoading(false);
          }
        }
      }
    } catch (e: any) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const solInstruction = (
    fromPubkey: PublicKey,
    toPubkey: PublicKey,
    amount: number
  ) => {
    return SystemProgram.transfer({
      fromPubkey: fromPubkey,
      toPubkey: toPubkey,
      lamports: Math.round(amount * LAMPORTS_PER_SOL),
    });
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen px-5 -z-3 bg-amber-400">
      <img src={imgList[turn]} className={`w-[380px]`} alt="" />
      <div className="flex flex-col items-center justify-between shadow-2xl w-full md:w-[500px] mr-3 p-2 rounded-xl">
        <h1 className="text-2xl font-extrabold uppercase">
          Mint Price : {MINT_PRICE} Sol
        </h1>
        {totalSupply !== MAX_SUPPLY && (
          <div className="flex items-center justify-between w-full">
            <span
              className={`text-black text-[60px] font-bold ${
                mintCount === 1
                  ? "cursor-not-allowed text-gray-400"
                  : "cursor-pointer"
              }`}
              onClick={() => mintCount > 1 && setMintCount(mintCount - 1)}
            >
              -
            </span>
            <span className="text-black text-[50px] font-bold">
              {mintCount}
            </span>
            <span
              className={`text-black text-[45px] font-bold ${
                mintCount === 5
                  ? "cursor-not-allowed text-gray-400"
                  : "cursor-pointer"
              }`}
              onClick={() =>
                mintCount < MAX_MINTAMOUNT_PERTX && setMintCount(mintCount + 1)
              }
            >
              +
            </span>
          </div>
        )}
        <div className="flex items-center justify-center w-full">
          <h1 className="">
            <span className="lg:text-[50px] text-[30px] font-medium ">
              {totalSupply?.toString().padStart(2, "0")}
            </span>
            /
            <span className="text-[20px] font-bold text-[#707070]">
              {MAX_SUPPLY}
            </span>
          </h1>
        </div>

        {totalSupply === MAX_SUPPLY ? (
          <p className="text-[50px] font-extrabold text-red-500 uppercase">
            Sold out!
          </p>
        ) : (
          <button
            className="flex items-center justify-center gap-3 px-5 py-3 font-extrabold text-black uppercase duration-300 bg-white border-b-2 border-black rounded-lg hover:bg-gray-200"
            onClick={() => {
              handleMintWithPhantom(rpcUrl, wallet, mintCount);
            }}
          >
            Mint Now
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-5">
        <Link href={"/"} passHref>
          <span className="flex items-center justify-center gap-4 mt-5 font-extrabold uppercase transition-all duration-300 cursor-pointer hover:-translate-x-3">
            <FaArrowLeft />
            Back to Home
          </span>
        </Link>
        <Link href={"/claim"} passHref>
          <span className="flex items-center justify-center gap-4 mt-5 font-extrabold uppercase transition-all duration-300 cursor-pointer hover:translate-x-3">
            To Claim Page
            <FaArrowRight />
          </span>
        </Link>
      </div>
      <div
        className={`fixed top-0 bottom-0 left-0 right-0 flex items-center justify-center uppercase font-extrabold ${
          loading
            ? "z-[99] opacity-1 bg-transparent backdrop-blur-xl transition-all duration-300 "
            : "-z-[9999] opacity-0 transition-all duration-300 "
        }`}
      >
        <FadeLoader color="black" /> Minting...
      </div>
    </div>
  );
}
