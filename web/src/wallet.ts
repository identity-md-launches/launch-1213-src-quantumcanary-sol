import { useCallback, useEffect, useState } from 'react';
import { createWalletClient, custom, getAddress, toHex, type Address } from 'viem';
import { type Config, type Injected } from './config';
import { errorMessage } from './chain';

export async function switchChain(provider: Injected, config: Config) {
  const chainId = toHex(config.manifest.chainId);
  try { await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] }); }
  catch (error) {
    const e = error as { code?: number; message?: string; data?: { originalError?: { code?: number } } };
    if (e.code !== 4902 && e.data?.originalError?.code !== 4902 && !/unknown chain|unrecognized chain|chain.*not.*added/i.test(e.message ?? '')) throw error;
    await provider.request({ method: 'wallet_addEthereumChain', params: [config.manifest.walletAddChain] });
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
  }
  if (Number(await provider.request({ method: 'eth_chainId' })) !== config.manifest.chainId) throw Error('Wallet is still on another network. Switch to Ethereum and retry.');
}
export function useWallet(config?: Config) {
  const [provider, setProvider] = useState<Injected>();
  const [account, setAccount] = useState<Address>();
  const [chainId, setChainId] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sync = useCallback(async (p: Injected) => {
    const [accounts, chain] = await Promise.all([p.request({ method: 'eth_accounts' }), p.request({ method: 'eth_chainId' })]);
    setAccount(accounts[0] ? getAddress(accounts[0]) : undefined); setChainId(Number(chain));
  }, []);
  useEffect(() => {
    if (!provider) return;
    const change = () => { void sync(provider).catch(() => { setAccount(undefined); setChainId(undefined); }); };
    const disconnect = () => { setAccount(undefined); setChainId(undefined); };
    provider.on?.('accountsChanged', change); provider.on?.('chainChanged', change); provider.on?.('disconnect', disconnect);
    return () => { provider.removeListener?.('accountsChanged', change); provider.removeListener?.('chainChanged', change); provider.removeListener?.('disconnect', disconnect); };
  }, [provider, sync]);
  const connect = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const p = window.ethereum;
      if (!p) throw Error('No browser wallet found. Open this page in an Ethereum wallet browser, or send ETH to the canary address from your own wallet. Reading needs no wallet.');
      await p.request({ method: 'eth_requestAccounts' }); setProvider(p); await sync(p);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  const switchNetwork = async () => {
    if (!provider || !config || busy) return;
    setBusy(true); setError('');
    try { await switchChain(provider, config); await sync(provider); } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  const wrongChain = !!account && chainId !== config?.manifest.chainId;
  return { provider, account, chainId, wrongChain, busy, error, connect, switchNetwork,
    disconnect: () => { setProvider(undefined); setAccount(undefined); setChainId(undefined); setError(''); },
  };
}
export type Wallet = ReturnType<typeof useWallet>;
export async function checkedWallet(config: Config, wallet: Wallet) {
  if (!wallet.provider || !wallet.account) throw Error('Connect an Ethereum wallet first.');
  const chainId = Number(await wallet.provider.request({ method: 'eth_chainId' }));
  const accounts = await wallet.provider.request({ method: 'eth_accounts' });
  if (chainId !== config.manifest.chainId) throw Error('Wallet network changed. Switch to Ethereum and review the action again.');
  if (!accounts[0] || getAddress(accounts[0]) !== wallet.account) throw Error('Wallet account changed. Review the action again.');
  return createWalletClient({ chain: config.chain, account: wallet.account, transport: custom(wallet.provider) });
}
