// TBD
// import { useState } from "react";
// import { ChevronRight } from "lucide-react";
// import {
//   LEATHER,
//   MAGIC_EDEN,
//   OKX,
//   OYL,
//   ORANGE,
//   PHANTOM,
//   UNISAT,
//   useLaserEyes,
//   WalletIcon,
//   WIZZ,
//   XVERSE,
//   SUPPORTED_WALLETS,
//   LaserEyesLogo,
// } from "@omnisat/lasereyes";

// export default function ConnectWallet({ className = "" }) {
//   const {
//     connect,
//     disconnect,
//     isConnecting,
//     address,
//     provider,
//     hasUnisat,
//     hasXverse,
//     hasOyl,
//     hasMagicEden,
//     hasOkx,
//     hasLeather,
//     hasPhantom,
//     hasWizz,
//     hasOrange,
//     hasOpNet,
//   } = useLaserEyes();
//   const [isOpen, setIsOpen] = useState(false);

//   const hasWallet = {
//     unisat: hasUnisat,
//     xverse: hasXverse,
//     oyl: hasOyl,
//     [MAGIC_EDEN]: hasMagicEden,
//     okx: hasOkx,
//     op_net: hasOpNet,
//     leather: hasLeather,
//     phantom: hasPhantom,
//     wizz: hasWizz,
//     orange: hasOrange,
//   };

//   const handleConnect = async (walletName) => {
//     if (provider === walletName) {
//       await disconnect();
//     } else {
//       setIsOpen(false);
//       await connect(walletName);
//     }
//   };

//   return (
//     <div className="wallet-connect">
//       {address ? (
//         <button
//           onClick={() => disconnect()}
//           className={`wallet-button ${className}`}
//         >
//           Disconnect
//         </button>
//       ) : (
//         <button
//           onClick={() => setIsOpen(true)}
//           className={`wallet-button ${className}`}
//         >
//           {isConnecting ? "Connecting..." : "Connect Wallet"}
//         </button>
//       )}

//       {isOpen && (
//         <div className="modal-overlay" onClick={() => setIsOpen(false)}>
//           <div className="modal-content" onClick={(e) => e.stopPropagation()}>
//             <div className="modal-header">
//               <h2>Connect Wallet</h2>
//             </div>

//             <div className="modal-body">
//               {Object.values(SUPPORTED_WALLETS).map((wallet) => {
//                 const isConnected = provider === wallet;
//                 const isMissingWallet = !hasWallet[wallet.name];

//                 return (
//                   <button
//                     key={wallet.name}
//                     onClick={
//                       isMissingWallet ? null : () => handleConnect(wallet.name)
//                     }
//                     className="wallet-option"
//                   >
//                     <div className="wallet-info">
//                       <div className="wallet-icon">
//                         <WalletIcon size={32} walletName={wallet.name} />
//                       </div>
//                       <span className="wallet-name">
//                         {wallet.name
//                           .replace(/[-_]/g, " ")
//                           .split(" ")
//                           .map(
//                             (word) =>
//                               word.charAt(0).toUpperCase() +
//                               word.slice(1).toLowerCase()
//                           )
//                           .join(" ")}
//                       </span>
//                     </div>

//                     {hasWallet[wallet.name] ? (
//                       <div className="wallet-status">
//                         <div className="status-installed">
//                           <div className="status-dot"></div>
//                           <span>Installed</span>
//                         </div>
//                         <ChevronRight className="chevron-icon" />
//                       </div>
//                     ) : (
//                       <a
//                         href={wallet.url}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className="install-link"
//                         onClick={(e) => e.stopPropagation()}
//                       >
//                         <ChevronRight />
//                         <span>Install</span>
//                       </a>
//                     )}
//                   </button>
//                 );
//               })}
//             </div>

//             <div className="modal-footer">
//               <div className="powered-by">
//                 <a
//                   href="https://www.lasereyes.build/"
//                   target="_blank"
//                   rel="noopener noreferrer"
//                 >
//                   Powered by LaserEyes
//                 </a>
//               </div>
//               <div className="footer-logo">
//                 <a
//                   href="https://www.lasereyes.build/"
//                   target="_blank"
//                   rel="noopener noreferrer"
//                 >
//                   <LaserEyesLogo width={48} color="blue" />
//                 </a>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
