import React, { useState, useEffect } from "react";
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { AnchorProvider, web3, Program, utils, BN } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import { getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";

import Coin from "../../components/Coin/Coin";
import NewSaleForm from "../../components/NewSaleForm/NewSaleForm";
import SaleList from "../../components/SaleList/SaleList";
import idl from '../../idl.json';
import classes from './Content.module.css';


window.Buffer = Buffer;

const programId = new PublicKey(idl.metadata.address);
const network = clusterApiUrl('devnet');
const opts = {
    preflightCommitment: 'processed'
}
const { SystemProgram } = web3;

const Content = props => {
    const initSaleFormData = {
        name: '',
        supply: 0,
        rate: 1
    };
    const [saleFormData, setSaleFormData] = useState(initSaleFormData);
    const [walletAddress, setWalletAddress] = useState(null);
    const [tokenSales, setTokenSales] = useState([]);

    const getProvider = () => {
        const connection = new Connection(network, opts.preflightCommitment);
        const provider = new AnchorProvider(connection, window.solana, opts.preflightCommitment);
        return provider;
    }

    const checkIfWalletIsConnected = async () => {
        try {
            const { solana } = window;
            if (solana && solana.isPhantom) {
                console.log('Phantom wallet found!');
                const response = await solana.connect({
                    onlyIfTrusted: true
                });
                console.log('Connected with public key: ', response.publicKey.toString());
                setWalletAddress(response.publicKey.toString());
                getTokenSales();
            } else {
                alert("Solana object not found! Get a Phantom wallet")
            }
        } catch (error) {
            console.log(error)
        }
    }

    const connectWallet = async () => {
        console.log('Connecting wallet');
        const { solana } = window;
        if (solana) {
            const response = await solana.connect();
            console.log('Connected with public key: ', response.publicKey.toString());
            setWalletAddress(response.publicKey.toString());
        }
        getTokenSales();
    }

    const handleSaleFormChange = (field, e) => {
        let data = { ...saleFormData };
        data[field] = e.target.value;
        setSaleFormData(data);
    }

    const addTokenSale = async () => {
        console.log('Creating a token sale: ', saleFormData);

        try {
            const provider = getProvider();
            const program = new Program(idl, programId, provider);
            const [sale] = PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode('escrow_pda'),
                utils.bytes.utf8.encode(saleFormData.name)
            ], program.programId);
            // FIXME: suspect the way the token address is used is causing this to fail
            const mint = new PublicKey("6D6Fn877PhAg6sHoftnDq6YdfCBZPeSb4y1dXa4BmX3W"); // currently just use address of a fixed token
            const [escrowTokenAccount] = PublicKey.findProgramAddressSync(
                [
                    provider.wallet.publicKey.toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    mint.toBuffer()
                ],
                program.programId
            );
            const adminTokenAccount = await getOrCreateAssociatedTokenAccount(provider.connection, provider.wallet, mint, provider.wallet.publicKey);

            await program.methods
                .initialize(new BN(saleFormData.supply), new BN(saleFormData.rate), saleFormData.name)
                .accounts({
                    escrowPda: sale,
                    saleTokenAccount: escrowTokenAccount,
                    mint: mint,
                    adminTokenAccount: adminTokenAccount.address,
                    mint: mint,
                    systemProgram: SystemProgram.programId
                })
                .rpc();
        } catch (error) {
            console.error(error)
        }
        // re-initialise form data
        setSaleFormData(initSaleFormData);
    }

    const getTokenSales = async () => {
        console.log('Checking token sales')
        const connection = new Connection(network, opts.preflightCommitment);
        const provider = getProvider();
        const program = new Program(idl, programId, provider);

        Promise.all(
            (await connection.getProgramAccounts(programId)).map(
                async (sale) => ({
                    ...(await program.account.escrowAccount.fetch(sale.pubkey)),
                    pubkey: sale.pubkey,
                })
            )
        ).then(tokenSales => {
            console.log('Token sales found: ', tokenSales);
            setTokenSales(tokenSales);
        })
    }

    const renderWalletConnectedContent = () => {
        return (
            <>
                <NewSaleForm data={saleFormData} handleInputChange={handleSaleFormChange} handleSubmit={addTokenSale} />
                <SaleList items={tokenSales} />
            </>
        )
    }

    const renderWalletNotConnectedContent = () => {
        return (
            <div className={classes.NoContent}>
                <button onClick={connectWallet}>Connect To Wallet</button>
            </div>
        )
    }

    useEffect(() => {
        console.log('Checking wallet')
        const onLoad = async () => {
            await checkIfWalletIsConnected();
        }
        window.addEventListener('load', onLoad);
        return () => window.removeEventListener('load', onLoad);
    }, []);

    return (
        <>
            <Coin />
            {walletAddress && renderWalletConnectedContent()}
            {!walletAddress && renderWalletNotConnectedContent()}
        </>
    )


}

export default Content;