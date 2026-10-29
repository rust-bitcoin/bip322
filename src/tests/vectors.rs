use super::fixtures::*;
use super::*;
use pretty_assertions::assert_eq;

#[test]
fn message_hashes_are_correct() {
  assert_eq!(
    hex::encode(tagged_hash(BIP322_TAG, "")),
    "c90c269c4f8fcbe6880f72a721ddfbf1914268a794cbb21cfafee13770ae19f1"
  );

  assert_eq!(
    hex::encode(tagged_hash(BIP322_TAG, "Hello World")),
    "f0eb03b1a75ac6d9847f55c624a99169b5dccba2a31f5b23bea77ba270de0a7a"
  );

  assert_eq!(
    hex::encode(tagged_hash(
      BIP322_TAG,
      "UTF-8 support: öäüéàè 测试文本 \u{1F604}"
    )),
    "43936b237ea38c7794eb5d755e0d220b6db92ebfc5c8f482759d22b1286376d7"
  );
}

#[test]
fn to_spend_txids_correct() {
  assert_eq!(
    create_to_spend(
      &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
      ""
    )
    .compute_txid()
    .to_string(),
    "c5680aa69bb8d860bf82d4e9cd3504b55dde018de765a91bb566283c545a99a7"
  );

  assert_eq!(
    create_to_spend(
      &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
      "Hello World"
    )
    .compute_txid()
    .to_string(),
    "b79d196740ad5217771c1098fc4a4b51e0535c32236c71f1ea4d61a2d603352b"
  );

  assert_eq!(
    create_to_spend(
      &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
      "UTF-8 support: öäüéàè 测试文本 \u{1F604}"
    )
    .compute_txid()
    .to_string(),
    "c8f4f525fe8afb1bc09b44175bd2096f079c98425e8a1be676b712add1fb62f0"
  );
}

#[test]
fn to_sign_txids_correct() {
  let to_spend = create_to_spend(
    &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
    "",
  );

  let to_sign = create_to_sign(&to_spend, None, LockParams::default());

  assert_eq!(
    to_sign.unsigned_tx.compute_txid().to_string(),
    "1e9654e951a5ba44c8604c4de6c67fd78a27e81dcadcfe1edf638ba3aaebaed6"
  );

  let to_spend = create_to_spend(
    &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
    "Hello World",
  );

  let to_sign = create_to_sign(&to_spend, None, LockParams::default());

  assert_eq!(
    to_sign.unsigned_tx.compute_txid().to_string(),
    "88737ae86f2077145f93cc4b153ae9a1cb8d56afa511988c149c5c8c9d93bddf"
  );

  let to_spend = create_to_spend(
    &Address::from_str(SEGWIT_ADDRESS).unwrap().assume_checked(),
    "UTF-8 support: öäüéàè 测试文本 \u{1F604}",
  );

  let to_sign = create_to_sign(&to_spend, None, LockParams::default());

  assert_eq!(
    to_sign.unsigned_tx.compute_txid().to_string(),
    "8f488e06b89eafd019ec528109eafaf7f1d1811fd617aa1eeb9658f1c1be6586"
  );
}

#[test]
fn official_vectors_simple() {
  #[track_caller]
  fn case(address: &str, message: &str, signature: &str) {
    assert_valid(crate::verify::verify_simple_encoded(
      address, message, signature,
    ));
  }

  case("bc1qqthe0hz8klx90e7stf6shclhsvqd5ly96pn53v", "2V6TUTMSH4VQ3Z7WZWKYD7DFNH", "AkgwRQIhALC6hdfxNy1n45d7UXSskRBdfZW0Al259E1kDMpipdYkAiAJPfZqb+WurZuf1apU5xeE6Igui9dvt5tihQLDvxlY1AEhAqbnruyo677ktQjio7XOchO3w51Dh9AbRVngha5jtNfT");
  case(
    "bc1pcquvhrqv0q68t4m0hfq6tpn006qrskyc7yrqnp2uyrf2emg3wynsdjyk38",
    "PURVOQ544B6HUATVBJZN5EZJUU",
    "AUB6B2Rbupzua8LTQIF06516wzl+cwKy1be8RgoiW0riyXdKwe6GTz/5Hnb37m67pJwIKCh+D5jDueG6KpvYpmu8",
  );
  case("bc1qw6g0rgrpuxvj4edkwtvzpmt3c5m08mhp8nuk3mrk4erufvlczp5ssdscjd", "G7ZTXXOVJFHGDD6XYJAGBAMT5A", "BABIMEUCIQCKl1f9Cj26k0fFWE48+O4ibhYJYPytbDZWJRaaG9BybwIgCbk+3BViWkpuu2RI+41dwtlQ/m/01G860pTFCzDFfokBSDBFAiEA0O77DJsaM7IO+Ht06sp3umzXB64CNNOwf2isZuPfdmwCIGlggOwRSkXsqlPhE1gMdd5hf7ycL33Orfrr4v/XnMGSAUdSIQNsu/OwZurHvJMoiJoSAmmCHLoqIc5Wblh+rek+7rhASCECgYVkUspeAxwRfM6v4GRBhN/gGxTfpPqZuOlBIYZxTJZSrg==");
  case("bc1qazhmhwl9sxgjmwnd96hh926s3x5l0cf64yy6hvyn6qms438x550qy5sgva", "Z3SB7SRL555ZGOHVMYT5WG7RIZ", "BQBHMEQCICNI6H6b+VCZV9Z2H6EW5hPrE1buC6SJuy2ljSNmQlGfAiASbm5UrA8KH6TwF6evx7COV+i27ubiq2v9TyLYPOO63gFIMEUCIQCMOFnJbg0sy88G6wUXjv5stjVgfvAokOogWsisdkAnlAIgETfBw7kJhISFu9vIomFcEF/1NsN6c0h3KjNcpmNAZtMBSDBFAiEA/lUU+wBeA3prt8vHRpcQN763OYZ8L61DfN0QI/gkHpMCIB2qHwgoXNTH0sdqeAMD2ah7dSTie2bflax3Q3I/GibQAWlTIQKo003Zjj9Jg/kT7sOA7cTdIKmzsrIYBAuPd9hj8FZuHCEC6BdalMtwbjcx2vJjVelv7BJml0rY7Q5ze+PWen6tb5shAytperlYBs69tbn86t3pINqXy0NzttKZKi6Y8X+USQXaU64=");
  case("bc1qp0ahvfh83088w49k405szqgg4f3pptr7p2g06tdxfjcd40z4lh4q95lsz9", "This will be a p2wsh 3-of-3 multisig BIP 322 signed message", "smpBQBHMEQCIFX9aaqPJWq2Ff2kpen5bFDTid+ehgUOpHV0LfjncXy4AiA3GNicF7aKPzdpa9PCpmaYQs3pHd+qbvvhXdxOCKCAMAFIMEUCIQD/ELXg6CNYyUQijCg96JtgvgjZb9dsl1Ctof4QAeyTcQIgVM/1AAblFl/DCt6A1gJg+T/i2qU5SQD09+chFJzolRwBSDBFAiEAlqRfSFyWNVQhvaCnmeV5tyneiCWMTcFbuujoD/pFa3wCIGnZjfQb8NolSYq9asV+ZeBSkCGHJcqnaV4JYS5MYPEGAWlTIQJ1aLEfEi/4p7wcV+XHZCBVvGGJZ7L3v+jhH+mZA8lN0yECCovfec+kIdllXpKCgA8RX/HZ2x5yHOtCSKP8/sf6pnwhAwxSng6kCgCXXSAmJOOZFdr3vdK3HzGqCFloOHgc5fM6U64=");
}

#[test]
fn official_vectors_full() {
  // All generated full vectors carry nVersion=2, nLockTime=2016 and
  // nSequence=2016.
  #[track_caller]
  fn case(address: &str, message: &str, signature: &str) {
    let result = crate::verify::verify_full_encoded(address, message, signature);
    assert!(
      matches!(
        result,
        Verification::Valid { time, age }
          if time == LockTime::from_height(2016).unwrap() && age == Sequence(2016)
      ),
      "got {result:?}"
    );
  }

  case("13vU5PUSuArDXJdCWZvUFEbgJ2wcmtSJWn", "MOISC5NCQ42ADH2SUXLELUJOWH", "AgAAAAGn3Z6t/gsHNyHdgZTOVro0Hej+qbd/ilU1ACalKoHX3gAAAABqRzBEAiB+8t/tm8Jm6zYv9JGZZVlAUjmqg7ZglIA39U+bim8EKQIgDv3E5cHOagN+xYgN3ZQjTYlAJp/WyslwJWuFP1TmM3IBIQJcPK2h9SY+Ki1oussvHnMdFAhJgsYBFPl+rNcMv9P1ROAHAAABAAAAAAAAAAABauAHAAA=");
  case("bc1qrqtlzcq86850yzgsyq9sssawx2qxlx5yq3xpkd", "KLE5MMJBTNF4AVZXIO3GIL5UWF", "AgAAAAABAUrfzHHOLAKmgCIFSTT3krp+cQxj1BDPBN4GBg3tRmFXAAAAAADgBwAAAQAAAAAAAAAAAWoCSDBFAiEAjYj85zyhQKa9DbMO0reDwdhkNwKJkF3q2qFcijXDgMUCIAaQ75s3fwqrCeYIUJugLvhxZFxQIVquGN90vIKCW3QLASEDMurnDzvc0zABUwVwCADfGXoDx/M3SQnYt7e3IHDoU3PgBwAA");
  case("bc1pve87s3l2levjmhetzr2f9xvep3y266xty0hnefmyv8tkxc3e4qssll2kdu", "XQMVC3YR6AOGZIHLSUQ2NSSBI2", "AgAAAAABAROFPNY6Zt8hFK0YQq5Wb6wk/CnUYEPtQ0HTHDyzNROrAAAAAADgBwAAAQAAAAAAAAAAAWoBQNRdLOo5XZY0SBqAsLZNr/z3Bqrmo3OxVn7e4tD/OOD4H9U/L1unq5Nmdz+S1w7SHtt46bFwnd8xnRVan8BofFfgBwAA");
  case("32Utb7Seg6EXq7UesMNJXhQ1gdohYNyzQ9", "EMYGZHEY3LIANYKCR7XJF3NMFQ", "AgAAAAABAe5xLNMlYQH4OGjJ3h4lqQaVp0Cic7mwxkvyWswqFMXeAAAAABcWABSy/hpDH/KLAi4x25Tmb2UaO1xtWeAHAAABAAAAAAAAAAABagJHMEQCIDEleqb0n1R5c21TGkWRXNFae98wbwI0QOyh/YmRuQX1AiAcv1MhyTzPOVgZ1VIwuu0tDxrVJUHK8lhOUOXpsZnGwwEhAsjeDEoWX8hvEC8A/692yGQsPh6JBO8Zf4aITEQsKAcJ4AcAAA==");
  case("bc1qg8r3cl47rrr75dwvr7jhzdukptegnmq8v0nmjd2jdn4qvlczqkts0rqtav", "QXYOWYWO7ZGJC4OPNC367HBUQF", "AgAAAAABAXshuDM6YKy1LClwk1ZOM5egX7RTFPOCvtxJkYFYk/FEAAAAAADgBwAAAQAAAAAAAAAAAWoEAEgwRQIhAI9uOxvqmBV0pldOoKWnSYhjobNhP4F+gxO0QlOdGtxFAiBROcNruLigZE4lj1DJEh8yGrqS00MeW463EO78TsaRFgFIMEUCIQCAhIqYuU4wDA2AYsU+QDVyucH4Tm/NSDP2+txyPMKEkAIgfuGlSh7ncxb2yV3S3aOF5uwHGqtIZjp3b4HW0d35EckBR1IhAkT3y4QqTOTzUs5AYq5eCl1g1vqgsHtiwgY0hKpSl7vOIQI07tYZDvxHcWuVOgULVj+LK1I63eqVWuQzUd0qkqpJ9FKu4AcAAA==");
  case("bc1q8vy6jhfe8ca0uruvr4aqkjk75dpg5m30rnwatg60uhya00dhlyqs2xvt2a", "3VJANNKSXPLND6YRKG6CUEUZXX", "AgAAAAABAU2vSmP5XYqecVKygaRRribDp5piMoVxUkxUnFSff8kRAAAAAADgBwAAAQAAAAAAAAAAAWoFAEgwRQIhAKBSw74gHlx272y4RzyU/ap7iNO5rmB6XXgBOy3Qsc/EAiBUnSrF/XhvuvAwi/mMme0JDpuCvl+oZ9C4f3H8OemXCAFIMEUCIQDK3wH0l2AvJ5FZ923ZMJkY1z0MBh1Nee9wjK7tVxFz5gIgdC1XBD/IdBPtx1xmyvSFhbIJlvnz98fPTm50K6KaXpEBSDBFAiEAyP3nXTzXrTmzq54x8jAY02ERHycEYzYqT9cpRTeEWg4CIHxRk3e3oPrM9oCZ8xcgNQ3lRhyc+G0qdDIl6qa8SN4AAWlTIQIlBvEshNuT7T6Ja01YgHs0G31etR15oRdjg2JJs6Hf5CEDBbFTr8NwzY8uUi5qQ1z16XJjdr9VZ1LBpDcElWryIwUhAkLyDL4FQMvj0TI89hZZ8ja4nCrlk9235CCAWXmU0hbgU67gBwAA");
  case("3PGZjFkYBL1m9WBWkWbCW5FEFTaS1Hj4EB", "NQVRV3DJYLKBANM3OPTNBULEU3", "AgAAAAABAVscdBvYDFN98A//Rt/fAWcN7mdM0x2yWzBjC33c7X5HAAAAACMiACDkkR/DseXy+GXBPtxHvHehUjHt+9XjRmZAgxuuomAC4eAHAAABAAAAAAAAAAABagQASDBFAiEA47YK5XeIGBMQC9bCfWb+IIfirIWlqAzQVc6E/lgBPZICIA0k/EO2t3YhqmYR5WdXUBGgAzR+IqgZ5/mxvj+4UoDTAUgwRQIhAPCIVZCSoIaOjY9BzYIXWEvbhpOl4JR88p/xYVoZObd6AiADyJXNqpDg/Lc2viPX14N2d0jQdEjamY4SmiU7GNbIOgFHUiED+4JBU/wACiE8VFbQF4DR8pKgz7+8X2+PHccTcGxVGdEhA9uIzp+4CB5QRgvrN1OXQbBmfW8kOd0cooPWMYJCHBCxUq7gBwAA");
  case("3Nye4j1GUFqCEBR3do2KEFZAs9oLe8NZ6X", "7OKFLKRXSP6J42VQOMSG7MVXEP", "AgAAAAEvAyd4zsoz8gcVU5H19GLYokTAN5PxuKCBlEPjODJ86gAAAADaAEcwRAIgT6rcfxgCmG6b3DpzNV6UG0jiCQGclG9sfiSpV45HDXMCIGgtqjFBuJ7rbi+cgnG0TZiKZaxMk0KI+gQd0pHJfEYCAUgwRQIhANCvCLjGMuZMzH+nCEkNhWhR45T6QRYMLin8utpuF9r1AiBTjG2NLjkre7ec+HPg8UUhK1jL1vgq7YKjq5ROv+h07AFHUiEDhKjcb/Pv1/7AYutzOXwgec08wwD/VwiPm58Lc0xjohghAhycjpwdBuP33orQXAH1CAsrgSkuspxM2+FPQ4OCVhQWUq7gBwAAAQAAAAAAAAAAAWrgBwAA");
}

#[test]
fn official_vectors_pof() {
  // All generated proof-of-funds vectors carry nLockTime=123 and
  // nSequence=456 on the first input.
  #[track_caller]
  fn case(address: &str, message: &str, signature: &str) {
    let result = verify_pof_encoded(address, message, signature);
    assert!(
      matches!(
        result,
        Verification::Valid { time, age }
          if time == LockTime::from_height(123).unwrap() && age == Sequence(456)
      ),
      "got {result:?}"
    );
  }

  case("1PgwDB9w9vKjqhXMaqDiZyktC4x2eC7Wkw", "2JNEDD7IJDSYLREMJ6Q7PTCQJD", "pofcHNidP8BAI8CAAAAA3UzG05Nmq3GQGeM4RuOvKR3OzsxeY3Iv7WeRpsFNQM0AAAAAADIAQAADCbiUkASpwj6kUReXXcYBQYbAO9L5G7WGpFwwoySY+UAAAAAAAAAAAA3p26yqXE6EPnIIn3fG72TA/ogmgx628m04thl4j0g/gAAAAAAAAAAAAEAAAAAAAAAAAFqewAAAAABAHcAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/////yIAIB2Ij79goPLYV23iushdHloX5BnvTP3sLOG1x4L5uCYKAAAAAAEAAAAAAAAAABl2qRT44D3t4ciLKM9Jqw/cQWbMKcrdMYisAAAAAAEHa0gwRQIhAMQa+hYcQZ+v/rcrR4/cn7MthXgjlI9vdOyWaff0ytI1AiBzwJB5Sa7Gg5o5l1YRo2kvPGVjPEXlcDSRXkY/m5pEGAEhAg/lEKOLDqGSy/dJvtUFqV+b0Ibfnat6xQVm3TFbRMUHAAEAVQAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABTkYFAAAAAAAZdqkUXAydgFhnOc1o76l++wzhjwbeADKIrAAAAAABB2pHMEQCIEN2q/Y9n1JliYceYA/Lcb+lab84iq5FRGEw0QDZvCthAiBbgsbUfkt5y4PN7iBLpuW8zBARbHVBfsX/vIRcAewd8wEhAl+mkzpSHsor/2HKnlhZQjD88o2fj45Xj+PLeO0vHShBAAEBIE5GBQAAAAAAF6kUmkCp3fSiSKNrfA9wZKySQBbrBJeHAQcXFgAUYWYrEU/y0qj1P/GYS2Yc7nhhe8MBCGsCRzBEAiACr5bTFlzWGiXis1Y01AMVGVlPBEgO8G/g+6c4cNbx5wIgYqXaNnAPVNWVjfaJ8DhIuOiAUiTHeNdjdYH9IpXjK1oBIQMs7LIzDohxaDGLK3Jxlyxu/lnEh3YdmVbtOwi/9/IvuQAA");
  case("1FUGbznJZgPPNR49WGpAMWGqd2EJy7L411", "PMRTSXKIH4LZUEK6FSWKNVC5OJ", "pofcHNidP8BAOECAAAABUW4YNCHQoyK7F1IWzGg2FITNBQfwfYHqccJdCb5bAXHAAAAAADIAQAA9NbnUz4hFOirIPCfd3puS86Tswp4PpGiajrMV7XvilQAAAAAAAAAAAD01udTPiEU6Ksg8J93em5LzpOzCng+kaJqOsxXte+KVAEAAAAAAAAAAPTW51M+IRToqyDwn3d6bkvOk7MKeD6Romo6zFe174pUAgAAAAAAAAAA9lQ2wLnGe0WMSw2PbknCdByQs2kNLxtiBDM+sQJAJBgAAAAAAAAAAAABAAAAAAAAAAABansAAAAAAQB3AAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP////8iACBS4HdhDkJcNnd/zYxBO18MP4A5XwfMIamCtF1YNPUjwQAAAAABAAAAAAAAAAAZdqkUnroEWW1vPFZWKfJOPc5EO3LAxSCIrAAAAAABB2pHMEQCIDs7N2tmsnkvKuT1I/yNArGthDLEPCxZAp3la3W2Wo0SAiB/KqF79idpHtYTi6zf/s3JR5zHYBmP3fzgpmLxiSCDUwEhAlPjWUeiLVieRuV8JE/trdheywBquxvrxw9CoKp0eWwUAAEAmQAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADTkYFAAAAAAAZdqkUXRw/3Id1+QdWOglIjBLaBryaNa+IrE5GBQAAAAAAGXapFLiTCxADZJL19c3fKa0A4EwBeL4hiKxORgUAAAAAABl2qRRbIpISPTZsY6A99RjTl/caNrBz64isAAAAAAEHakcwRAIgKV6AGU+4LXwaNsWW6KCEMlYg+ofeoon3ngVHaq+kLn4CIBFHlP9K6vENM5lo3QvM7bITh9jDqzDMeqX3IuLyXDsZASED8CBlrMcXM6gidBwP2HZk8FQ3D2JV4eX5ct3++h7LqT8AAQdrSDBFAiEAxqn43CUk0TCc54a/k4ko++06fDv/CamisK6IdxGowNsCIHDikdfH1lfFO+CBM8nf6bp37gfgQ7GZoaMMbU0Bap7MASECEClqBF8XySkMqIUrrjXIAg/fUHiIjqCH3jDbVTSEUK4AAQdrSDBFAiEAwK0nkBarbo8wdZDg4FVeJIuP6iLp9fApYMhArfPEcfICIGgoPoco1fpw77syuPxvU5HZjYiOl4FChRfZ800L4bKKASECTFBcVWr9yTopKH4A4FZvEvmGXW06MgHwxN58FPvmQRkAAQEgTkYFAAAAAAAXqRQPyvIXY4yAKCGbkYlxD3LPMT/JSocBBxcWABRh7fUdOB8FWstJKAmt5r6qUQzMYgEIbAJIMEUCIQDd0I64asHGizPfnwvUVscgJo+8xZmv+IbtXNBXgLsdqwIgASUwxhy/0TTp/yLygwCfevxbXxoUYbIM2vdomk6jw3gBIQMchUGFw2XkvTvbr64BBBVQHRZdDv+KLY5VWN00qooCiAAA");
  case("bc1pk3vq3wpn4txexwq4dj0k2dugzp6kfwllvs89w49cvtk3j2cndcds3l9kw9", "FUYMQWKYGS7HJEN7YFEZU5SNR5", "pofcHNidP8BALgCAAAABDzMFysa2DX0k4ZymoVfzNzTIL3gsWlu03HcfI+NxhOxAAAAAADIAQAAVd4moQMhq/rd+2ecRsJ0Xeg6/SdhA+owjzyzg/Fqd/oAAAAAAAAAAABuZFRaqjWRO6kKy5hrEHAg+T12/Iuz+FZBwwMt/FQvkgAAAAAAAAAAAG5kVFqqNZE7qQrLmGsQcCD5PXb8i7P4VkHDAy38VC+SAQAAAAAAAAAAAQAAAAAAAAAAAWp7AAAAAAEBKwAAAAAAAAAAIlEgtFgIuDOqzZM4FWyfZTeIEHVku/9kDldUuGLtGSsTbhsBCEIBQKoTEBqEPkib1fLnELbmsbDVlmWGzOdiiN/XJefU3tF9AEi7PszYEPguomxXp7X2rL0dP0xkV6LbBcVz7oAEeKkAAQErTkYFAAAAAAAiUSB4i5DCtSPHOkI30E30ayMoWL47vA5l2NBJp/pZ1XGduAEIQgFAic0muhAJNc4ZlRWeJGRgkN+oE/ptV4Znyli19VAnSsHM/Pb9Mp02dd3zk3RmuT6VgjBxdJn2yURGKOka3l9cugABAStORgUAAAAAACJRIMoNyg9Pai/pn4PHTOMEsDHkuUAHt5riqU81NVVj+fXKAQhCAUCL3W2Jh3ImNRSpbp0bLe+rBE4GJw5AjwJEhakHsm83YfuQKeY1syBFrmNV2ZvLv8R8uTLcmkJ1s/lWUxZ9o4qJAAEBK05GBQAAAAAAIlEgXCutuyDOvc4hiADdov7VmOUfq4ww6HES7JZ6NAucMJkBCEIBQDqu/4oik+J+eAbvUhzzuBkoVoOgD5RySjpvJQqTKNieBda8dMTkH2avx6ghs7zd6puujlBCQw3r/NiG4VX7wAEAAA==");
}

#[test]
fn official_vectors_rejected() {
  #[track_caller]
  fn case(address: &str, message: &str, signature: &str, full: bool) {
    // Guard against transcription drift: the address must be a valid
    // mainnet address, so a typo cannot masquerade as a rejection.
    Address::from_str(address)
      .unwrap()
      .require_network(bitcoin::Network::Bitcoin)
      .unwrap();

    let result = run(address, message, signature, full);
    assert!(matches!(result, Verification::Invalid(_)), "got {result:?}");
  }

  #[track_caller]
  fn inconclusive(address: &str, message: &str, signature: &str, full: bool) {
    let result = run(address, message, signature, full);
    assert!(
      matches!(result, Verification::Inconclusive),
      "got {result:?}"
    );
  }

  fn run(address: &str, message: &str, signature: &str, full: bool) -> Verification {
    if full {
      crate::verify::verify_full_encoded(address, message, signature)
    } else {
      crate::verify::verify_simple_encoded(address, message, signature)
    }
  }

  // The spec's valid p2tr-time-lock and p2wsh-time-lock vectors. Their
  // scripts (`<n> OP_CHECKSEQUENCEVERIFY OP_DROP`) are not expressible in
  // miniscript — `older` is a K-type fragment with no `v:` wrapper — so the
  // interpreter cannot parse them and the spec-mandated outcome for this
  // validator is inconclusive.
  inconclusive("bc1p6vffkx7vcyezrjq7pg9qqdjv7vmtanfhk8ukwsn4syejwmarmhxqp0rw5x", "AY2VOQOXYI5CN2EHZKLOX7ZI37", "AgAAAAABAaza7/ukfX9ZdxCUvK7CPJgADDdPdF7ikXVKWctd5EHrAAAAAADgBwAAAQAAAAAAAAAAAWoEQPvuT0enYGwsab2lsPZU0U3OcRkGng+o/PAt4QU2lc8hG7lTUmflkt0To+eoipv2vptf0TlGOBCsKU5xE3kXKcMAS2MgrYfXhOkh0CvwuJpB+O3tal2ECfO0v7k1/A4PTlGcQiBnAuAHsnUgJjLn4tl5ytgC8CNTyITXmg4rx9ctxPedwRMPEBvfoUBorCHBJjLn4tl5ytgC8CNTyITXmg4rx9ctxPedwRMPEBvfoUDgBwAA", true);
  inconclusive("bc1qhqcmw7ud03vqde3pe6hzajaylhucmlatrkcztzpnk8vpgvhg9dzq5ydark", "MGKMA2MJUBDHT55J7MHOLM7UPE", "AgAAAAABAYYJeOOOi3c33O+dholAwiF51Amy/E0qIf3ew2vFtDtTAAAAAADgBwAAAQAAAAAAAAAAAWoDSDBFAiEA64MwD2HkJjPLPAc2u5ia6ZdwCVO3okzVqGPEXnuJGZQCIE27BGOBQTdwJ2M/Wdsm6nFVunqaj+xZBSG/g/64FMbtAQBNYyEDrYfXhOkh0CvwuJpB+O3tal2ECfO0v7k1/A4PTlGcQiBnAuAHsnUhA4ZGGvodKgqeg/ZYffm6miaKaG57VkCSjmmRprCa+ulyaKzgBwAA", true);

  // wrong message for p2tr-time-lock full signature
  case("bc1p6vffkx7vcyezrjq7pg9qqdjv7vmtanfhk8ukwsn4syejwmarmhxqp0rw5x", "ATGH7VC42BMKAAJAMBG3KNGQGR", "AgAAAAABAaza7/ukfX9ZdxCUvK7CPJgADDdPdF7ikXVKWctd5EHrAAAAAADgBwAAAQAAAAAAAAAAAWoEQPvuT0enYGwsab2lsPZU0U3OcRkGng+o/PAt4QU2lc8hG7lTUmflkt0To+eoipv2vptf0TlGOBCsKU5xE3kXKcMAS2MgrYfXhOkh0CvwuJpB+O3tal2ECfO0v7k1/A4PTlGcQiBnAuAHsnUgJjLn4tl5ytgC8CNTyITXmg4rx9ctxPedwRMPEBvfoUBorCHBJjLn4tl5ytgC8CNTyITXmg4rx9ctxPedwRMPEBvfoUDgBwAA", true);
  // wrong message for p2wsh-time-lock full signature
  case("bc1qhqcmw7ud03vqde3pe6hzajaylhucmlatrkcztzpnk8vpgvhg9dzq5ydark", "QMSIBU4KPG4CGHGBGFRFHXVYLR", "AgAAAAABAYYJeOOOi3c33O+dholAwiF51Amy/E0qIf3ew2vFtDtTAAAAAADgBwAAAQAAAAAAAAAAAWoDSDBFAiEA64MwD2HkJjPLPAc2u5ia6ZdwCVO3okzVqGPEXnuJGZQCIE27BGOBQTdwJ2M/Wdsm6nFVunqaj+xZBSG/g/64FMbtAQBNYyEDrYfXhOkh0CvwuJpB+O3tal2ECfO0v7k1/A4PTlGcQiBnAuAHsnUhA4ZGGvodKgqeg/ZYffm6miaKaG57VkCSjmmRprCa+ulyaKzgBwAA", true);
  // wrong signer for p2tr-time-lock full signature
  case("bc1pfncmfyycsv5zpnrzy3hj7qna989kymm2ekps7ph2mwwyftjy3d6s2esen0", "AY2VOQOXYI5CN2EHZKLOX7ZI37", "AgAAAAABAaza7/ukfX9ZdxCUvK7CPJgADDdPdF7ikXVKWctd5EHrAAAAAADgBwAAAQAAAAAAAAAAAWoEQPvuT0enYGwsab2lsPZU0U3OcRkGng+o/PAt4QU2lc8hG7lTUmflkt0To+eoipv2vptf0TlGOBCsKU5xE3kXKcMAS2MgrYfXhOkh0CvwuJpB+O3tal2ECfO0v7k1/A4PTlGcQiBnAuAHsnUgJjLn4tl5ytgC8CNTyITXmg4rx9ctxPedwRMPEBvfoUBorCHBJjLn4tl5ytgC8CNTyITXmg4rx9ctxPedwRMPEBvfoUDgBwAA", true);
  // wrong signer for p2wsh-time-lock full signature
  case("bc1qlcg74qa5r0ltu6zruahaap3keqsksad6kpstqyysxu0y7tkz2jlqepjywu", "MGKMA2MJUBDHT55J7MHOLM7UPE", "AgAAAAABAYYJeOOOi3c33O+dholAwiF51Amy/E0qIf3ew2vFtDtTAAAAAADgBwAAAQAAAAAAAAAAAWoDSDBFAiEA64MwD2HkJjPLPAc2u5ia6ZdwCVO3okzVqGPEXnuJGZQCIE27BGOBQTdwJ2M/Wdsm6nFVunqaj+xZBSG/g/64FMbtAQBNYyEDrYfXhOkh0CvwuJpB+O3tal2ECfO0v7k1/A4PTlGcQiBnAuAHsnUhA4ZGGvodKgqeg/ZYffm6miaKaG57VkCSjmmRprCa+ulyaKzgBwAA", true);

  // wrong message for p2wpkh simple signature
  case("bc1qqthe0hz8klx90e7stf6shclhsvqd5ly96pn53v", "EFGJ4AZYXDV7NDUDSUDB3NCDUC", "AkgwRQIhALC6hdfxNy1n45d7UXSskRBdfZW0Al259E1kDMpipdYkAiAJPfZqb+WurZuf1apU5xeE6Igui9dvt5tihQLDvxlY1AEhAqbnruyo677ktQjio7XOchO3w51Dh9AbRVngha5jtNfT", false);
  // wrong signer for p2wpkh simple signature
  case("bc1qgg6lpr05az2l5kz402ddz5ez7fdu25kgmd40lf", "2V6TUTMSH4VQ3Z7WZWKYD7DFNH", "AkgwRQIhALC6hdfxNy1n45d7UXSskRBdfZW0Al259E1kDMpipdYkAiAJPfZqb+WurZuf1apU5xeE6Igui9dvt5tihQLDvxlY1AEhAqbnruyo677ktQjio7XOchO3w51Dh9AbRVngha5jtNfT", false);
  // wrong message for p2tr simple signature
  case(
    "bc1pcquvhrqv0q68t4m0hfq6tpn006qrskyc7yrqnp2uyrf2emg3wynsdjyk38",
    "56VM6YK6Y76XTBXNPITF232EPX",
    "AUB6B2Rbupzua8LTQIF06516wzl+cwKy1be8RgoiW0riyXdKwe6GTz/5Hnb37m67pJwIKCh+D5jDueG6KpvYpmu8",
    false,
  );
  // wrong signer for p2tr simple signature
  case(
    "bc1pltvk000nd54v3hrrcn7lsffdra72hphpm40rhzf9hn8arqkgermq2p9029",
    "PURVOQ544B6HUATVBJZN5EZJUU",
    "AUB6B2Rbupzua8LTQIF06516wzl+cwKy1be8RgoiW0riyXdKwe6GTz/5Hnb37m67pJwIKCh+D5jDueG6KpvYpmu8",
    false,
  );

  // wrong message for p2wsh-multisig-2of2 simple signature
  case("bc1qw6g0rgrpuxvj4edkwtvzpmt3c5m08mhp8nuk3mrk4erufvlczp5ssdscjd", "DL2KXDPQAN63YIQPIP34O3XYVX", "BABIMEUCIQCKl1f9Cj26k0fFWE48+O4ibhYJYPytbDZWJRaaG9BybwIgCbk+3BViWkpuu2RI+41dwtlQ/m/01G860pTFCzDFfokBSDBFAiEA0O77DJsaM7IO+Ht06sp3umzXB64CNNOwf2isZuPfdmwCIGlggOwRSkXsqlPhE1gMdd5hf7ycL33Orfrr4v/XnMGSAUdSIQNsu/OwZurHvJMoiJoSAmmCHLoqIc5Wblh+rek+7rhASCECgYVkUspeAxwRfM6v4GRBhN/gGxTfpPqZuOlBIYZxTJZSrg==", false);
  // wrong signer for p2wsh-multisig-2of2 simple signature
  case("bc1q47vnwr6fsarstmmw89wrkvl89540sn5g79x75ms8aly9rrsnq8eqh3v9gz", "G7ZTXXOVJFHGDD6XYJAGBAMT5A", "BABIMEUCIQCKl1f9Cj26k0fFWE48+O4ibhYJYPytbDZWJRaaG9BybwIgCbk+3BViWkpuu2RI+41dwtlQ/m/01G860pTFCzDFfokBSDBFAiEA0O77DJsaM7IO+Ht06sp3umzXB64CNNOwf2isZuPfdmwCIGlggOwRSkXsqlPhE1gMdd5hf7ycL33Orfrr4v/XnMGSAUdSIQNsu/OwZurHvJMoiJoSAmmCHLoqIc5Wblh+rek+7rhASCECgYVkUspeAxwRfM6v4GRBhN/gGxTfpPqZuOlBIYZxTJZSrg==", false);
  // wrong message for p2wsh-multisig-3of3 simple signature
  case("bc1qazhmhwl9sxgjmwnd96hh926s3x5l0cf64yy6hvyn6qms438x550qy5sgva", "UKLIJM5HKKQEIFJ44R7UIQFMYL", "BQBHMEQCICNI6H6b+VCZV9Z2H6EW5hPrE1buC6SJuy2ljSNmQlGfAiASbm5UrA8KH6TwF6evx7COV+i27ubiq2v9TyLYPOO63gFIMEUCIQCMOFnJbg0sy88G6wUXjv5stjVgfvAokOogWsisdkAnlAIgETfBw7kJhISFu9vIomFcEF/1NsN6c0h3KjNcpmNAZtMBSDBFAiEA/lUU+wBeA3prt8vHRpcQN763OYZ8L61DfN0QI/gkHpMCIB2qHwgoXNTH0sdqeAMD2ah7dSTie2bflax3Q3I/GibQAWlTIQKo003Zjj9Jg/kT7sOA7cTdIKmzsrIYBAuPd9hj8FZuHCEC6BdalMtwbjcx2vJjVelv7BJml0rY7Q5ze+PWen6tb5shAytperlYBs69tbn86t3pINqXy0NzttKZKi6Y8X+USQXaU64=", false);
  // wrong signer for p2wsh-multisig-3of3 simple signature
  case("bc1qnckc2q6804depn2240l66p93e0mscp7vd9ndptfuznex86ehpcvseq6e8a", "Z3SB7SRL555ZGOHVMYT5WG7RIZ", "BQBHMEQCICNI6H6b+VCZV9Z2H6EW5hPrE1buC6SJuy2ljSNmQlGfAiASbm5UrA8KH6TwF6evx7COV+i27ubiq2v9TyLYPOO63gFIMEUCIQCMOFnJbg0sy88G6wUXjv5stjVgfvAokOogWsisdkAnlAIgETfBw7kJhISFu9vIomFcEF/1NsN6c0h3KjNcpmNAZtMBSDBFAiEA/lUU+wBeA3prt8vHRpcQN763OYZ8L61DfN0QI/gkHpMCIB2qHwgoXNTH0sdqeAMD2ah7dSTie2bflax3Q3I/GibQAWlTIQKo003Zjj9Jg/kT7sOA7cTdIKmzsrIYBAuPd9hj8FZuHCEC6BdalMtwbjcx2vJjVelv7BJml0rY7Q5ze+PWen6tb5shAytperlYBs69tbn86t3pINqXy0NzttKZKi6Y8X+USQXaU64=", false);
  // wrong message for p2pkh full signature
  case("13vU5PUSuArDXJdCWZvUFEbgJ2wcmtSJWn", "TCHG6CQ5E2T5S4S7DPLAEFVDY2", "AgAAAAGn3Z6t/gsHNyHdgZTOVro0Hej+qbd/ilU1ACalKoHX3gAAAABqRzBEAiB+8t/tm8Jm6zYv9JGZZVlAUjmqg7ZglIA39U+bim8EKQIgDv3E5cHOagN+xYgN3ZQjTYlAJp/WyslwJWuFP1TmM3IBIQJcPK2h9SY+Ki1oussvHnMdFAhJgsYBFPl+rNcMv9P1ROAHAAABAAAAAAAAAAABauAHAAA=", true);
  // wrong signer for p2pkh full signature
  case("1BxMhvfWLnGLqVhJ3j39oDBk7qf5D86BFe", "MOISC5NCQ42ADH2SUXLELUJOWH", "AgAAAAGn3Z6t/gsHNyHdgZTOVro0Hej+qbd/ilU1ACalKoHX3gAAAABqRzBEAiB+8t/tm8Jm6zYv9JGZZVlAUjmqg7ZglIA39U+bim8EKQIgDv3E5cHOagN+xYgN3ZQjTYlAJp/WyslwJWuFP1TmM3IBIQJcPK2h9SY+Ki1oussvHnMdFAhJgsYBFPl+rNcMv9P1ROAHAAABAAAAAAAAAAABauAHAAA=", true);
  // wrong message for p2wpkh full signature
  case("bc1qrqtlzcq86850yzgsyq9sssawx2qxlx5yq3xpkd", "VENQMXVEGEJAAXJV5V24T6G5UU", "AgAAAAABAUrfzHHOLAKmgCIFSTT3krp+cQxj1BDPBN4GBg3tRmFXAAAAAADgBwAAAQAAAAAAAAAAAWoCSDBFAiEAjYj85zyhQKa9DbMO0reDwdhkNwKJkF3q2qFcijXDgMUCIAaQ75s3fwqrCeYIUJugLvhxZFxQIVquGN90vIKCW3QLASEDMurnDzvc0zABUwVwCADfGXoDx/M3SQnYt7e3IHDoU3PgBwAA", true);
  // wrong signer for p2wpkh full signature
  case("bc1q55chmwm4x8aeye0h9c0mryra2ly8k8fh3scqgj", "KLE5MMJBTNF4AVZXIO3GIL5UWF", "AgAAAAABAUrfzHHOLAKmgCIFSTT3krp+cQxj1BDPBN4GBg3tRmFXAAAAAADgBwAAAQAAAAAAAAAAAWoCSDBFAiEAjYj85zyhQKa9DbMO0reDwdhkNwKJkF3q2qFcijXDgMUCIAaQ75s3fwqrCeYIUJugLvhxZFxQIVquGN90vIKCW3QLASEDMurnDzvc0zABUwVwCADfGXoDx/M3SQnYt7e3IHDoU3PgBwAA", true);
  // wrong message for p2tr full signature
  case("bc1pve87s3l2levjmhetzr2f9xvep3y266xty0hnefmyv8tkxc3e4qssll2kdu", "P2RQWD264CW7Z5ZSSSDRW2JEDB", "AgAAAAABAROFPNY6Zt8hFK0YQq5Wb6wk/CnUYEPtQ0HTHDyzNROrAAAAAADgBwAAAQAAAAAAAAAAAWoBQNRdLOo5XZY0SBqAsLZNr/z3Bqrmo3OxVn7e4tD/OOD4H9U/L1unq5Nmdz+S1w7SHtt46bFwnd8xnRVan8BofFfgBwAA", true);
  // wrong signer for p2tr full signature
  case("bc1py2f3exluva2yqa877qnsj3vk4lm8yatw0up4fhrx04hf8ns87weswck94p", "XQMVC3YR6AOGZIHLSUQ2NSSBI2", "AgAAAAABAROFPNY6Zt8hFK0YQq5Wb6wk/CnUYEPtQ0HTHDyzNROrAAAAAADgBwAAAQAAAAAAAAAAAWoBQNRdLOo5XZY0SBqAsLZNr/z3Bqrmo3OxVn7e4tD/OOD4H9U/L1unq5Nmdz+S1w7SHtt46bFwnd8xnRVan8BofFfgBwAA", true);
  // wrong message for p2sh-p2wpkh full signature
  case("32Utb7Seg6EXq7UesMNJXhQ1gdohYNyzQ9", "CPVOBEXDTFAXS6N4YASD753CZV", "AgAAAAABAe5xLNMlYQH4OGjJ3h4lqQaVp0Cic7mwxkvyWswqFMXeAAAAABcWABSy/hpDH/KLAi4x25Tmb2UaO1xtWeAHAAABAAAAAAAAAAABagJHMEQCIDEleqb0n1R5c21TGkWRXNFae98wbwI0QOyh/YmRuQX1AiAcv1MhyTzPOVgZ1VIwuu0tDxrVJUHK8lhOUOXpsZnGwwEhAsjeDEoWX8hvEC8A/692yGQsPh6JBO8Zf4aITEQsKAcJ4AcAAA==", true);
  // wrong signer for p2sh-p2wpkh full signature
  case("3QMEQj2LTUtKKR1UatUK44z1NwrWrcVSGh", "EMYGZHEY3LIANYKCR7XJF3NMFQ", "AgAAAAABAe5xLNMlYQH4OGjJ3h4lqQaVp0Cic7mwxkvyWswqFMXeAAAAABcWABSy/hpDH/KLAi4x25Tmb2UaO1xtWeAHAAABAAAAAAAAAAABagJHMEQCIDEleqb0n1R5c21TGkWRXNFae98wbwI0QOyh/YmRuQX1AiAcv1MhyTzPOVgZ1VIwuu0tDxrVJUHK8lhOUOXpsZnGwwEhAsjeDEoWX8hvEC8A/692yGQsPh6JBO8Zf4aITEQsKAcJ4AcAAA==", true);

  // wrong message for p2wsh-multisig-2of2 full signature
  case("bc1qg8r3cl47rrr75dwvr7jhzdukptegnmq8v0nmjd2jdn4qvlczqkts0rqtav", "OANRY57VZNHOXZNYGCGZM5ADYG", "AgAAAAABAXshuDM6YKy1LClwk1ZOM5egX7RTFPOCvtxJkYFYk/FEAAAAAADgBwAAAQAAAAAAAAAAAWoEAEgwRQIhAI9uOxvqmBV0pldOoKWnSYhjobNhP4F+gxO0QlOdGtxFAiBROcNruLigZE4lj1DJEh8yGrqS00MeW463EO78TsaRFgFIMEUCIQCAhIqYuU4wDA2AYsU+QDVyucH4Tm/NSDP2+txyPMKEkAIgfuGlSh7ncxb2yV3S3aOF5uwHGqtIZjp3b4HW0d35EckBR1IhAkT3y4QqTOTzUs5AYq5eCl1g1vqgsHtiwgY0hKpSl7vOIQI07tYZDvxHcWuVOgULVj+LK1I63eqVWuQzUd0qkqpJ9FKu4AcAAA==", true);
  // wrong signer for p2wsh-multisig-2of2 full signature
  case("bc1qan5sys8u4cpvgutt70fn2tgweu7as9aw0slljuz86x4nyr8myvjsgz3q2v", "QXYOWYWO7ZGJC4OPNC367HBUQF", "AgAAAAABAXshuDM6YKy1LClwk1ZOM5egX7RTFPOCvtxJkYFYk/FEAAAAAADgBwAAAQAAAAAAAAAAAWoEAEgwRQIhAI9uOxvqmBV0pldOoKWnSYhjobNhP4F+gxO0QlOdGtxFAiBROcNruLigZE4lj1DJEh8yGrqS00MeW463EO78TsaRFgFIMEUCIQCAhIqYuU4wDA2AYsU+QDVyucH4Tm/NSDP2+txyPMKEkAIgfuGlSh7ncxb2yV3S3aOF5uwHGqtIZjp3b4HW0d35EckBR1IhAkT3y4QqTOTzUs5AYq5eCl1g1vqgsHtiwgY0hKpSl7vOIQI07tYZDvxHcWuVOgULVj+LK1I63eqVWuQzUd0qkqpJ9FKu4AcAAA==", true);
  // wrong message for p2wsh-multisig-3of3 full signature
  case("bc1q8vy6jhfe8ca0uruvr4aqkjk75dpg5m30rnwatg60uhya00dhlyqs2xvt2a", "UZQGB4YTYIS3PRT3UUOCO3YCX3", "AgAAAAABAU2vSmP5XYqecVKygaRRribDp5piMoVxUkxUnFSff8kRAAAAAADgBwAAAQAAAAAAAAAAAWoFAEgwRQIhAKBSw74gHlx272y4RzyU/ap7iNO5rmB6XXgBOy3Qsc/EAiBUnSrF/XhvuvAwi/mMme0JDpuCvl+oZ9C4f3H8OemXCAFIMEUCIQDK3wH0l2AvJ5FZ923ZMJkY1z0MBh1Nee9wjK7tVxFz5gIgdC1XBD/IdBPtx1xmyvSFhbIJlvnz98fPTm50K6KaXpEBSDBFAiEAyP3nXTzXrTmzq54x8jAY02ERHycEYzYqT9cpRTeEWg4CIHxRk3e3oPrM9oCZ8xcgNQ3lRhyc+G0qdDIl6qa8SN4AAWlTIQIlBvEshNuT7T6Ja01YgHs0G31etR15oRdjg2JJs6Hf5CEDBbFTr8NwzY8uUi5qQ1z16XJjdr9VZ1LBpDcElWryIwUhAkLyDL4FQMvj0TI89hZZ8ja4nCrlk9235CCAWXmU0hbgU67gBwAA", true);
  // wrong signer for p2wsh-multisig-3of3 full signature
  case("bc1qma94rw0f5t4l64wc6xfrjuuatqn6klcwmxvls86y9k4rjvva40wqr8u0cq", "3VJANNKSXPLND6YRKG6CUEUZXX", "AgAAAAABAU2vSmP5XYqecVKygaRRribDp5piMoVxUkxUnFSff8kRAAAAAADgBwAAAQAAAAAAAAAAAWoFAEgwRQIhAKBSw74gHlx272y4RzyU/ap7iNO5rmB6XXgBOy3Qsc/EAiBUnSrF/XhvuvAwi/mMme0JDpuCvl+oZ9C4f3H8OemXCAFIMEUCIQDK3wH0l2AvJ5FZ923ZMJkY1z0MBh1Nee9wjK7tVxFz5gIgdC1XBD/IdBPtx1xmyvSFhbIJlvnz98fPTm50K6KaXpEBSDBFAiEAyP3nXTzXrTmzq54x8jAY02ERHycEYzYqT9cpRTeEWg4CIHxRk3e3oPrM9oCZ8xcgNQ3lRhyc+G0qdDIl6qa8SN4AAWlTIQIlBvEshNuT7T6Ja01YgHs0G31etR15oRdjg2JJs6Hf5CEDBbFTr8NwzY8uUi5qQ1z16XJjdr9VZ1LBpDcElWryIwUhAkLyDL4FQMvj0TI89hZZ8ja4nCrlk9235CCAWXmU0hbgU67gBwAA", true);
  // wrong message for p2sh-p2wsh-multisig-2of2 full signature
  case("3PGZjFkYBL1m9WBWkWbCW5FEFTaS1Hj4EB", "FOQHOIFXJVPFSGGBRLAX53D6R2", "AgAAAAABAVscdBvYDFN98A//Rt/fAWcN7mdM0x2yWzBjC33c7X5HAAAAACMiACDkkR/DseXy+GXBPtxHvHehUjHt+9XjRmZAgxuuomAC4eAHAAABAAAAAAAAAAABagQASDBFAiEA47YK5XeIGBMQC9bCfWb+IIfirIWlqAzQVc6E/lgBPZICIA0k/EO2t3YhqmYR5WdXUBGgAzR+IqgZ5/mxvj+4UoDTAUgwRQIhAPCIVZCSoIaOjY9BzYIXWEvbhpOl4JR88p/xYVoZObd6AiADyJXNqpDg/Lc2viPX14N2d0jQdEjamY4SmiU7GNbIOgFHUiED+4JBU/wACiE8VFbQF4DR8pKgz7+8X2+PHccTcGxVGdEhA9uIzp+4CB5QRgvrN1OXQbBmfW8kOd0cooPWMYJCHBCxUq7gBwAA", true);
  // wrong signer for p2sh-p2wsh-multisig-2of2 full signature
  case("3DA7VZKYcuiaJFsDnzWjBDvh4VhBFZk6jg", "NQVRV3DJYLKBANM3OPTNBULEU3", "AgAAAAABAVscdBvYDFN98A//Rt/fAWcN7mdM0x2yWzBjC33c7X5HAAAAACMiACDkkR/DseXy+GXBPtxHvHehUjHt+9XjRmZAgxuuomAC4eAHAAABAAAAAAAAAAABagQASDBFAiEA47YK5XeIGBMQC9bCfWb+IIfirIWlqAzQVc6E/lgBPZICIA0k/EO2t3YhqmYR5WdXUBGgAzR+IqgZ5/mxvj+4UoDTAUgwRQIhAPCIVZCSoIaOjY9BzYIXWEvbhpOl4JR88p/xYVoZObd6AiADyJXNqpDg/Lc2viPX14N2d0jQdEjamY4SmiU7GNbIOgFHUiED+4JBU/wACiE8VFbQF4DR8pKgz7+8X2+PHccTcGxVGdEhA9uIzp+4CB5QRgvrN1OXQbBmfW8kOd0cooPWMYJCHBCxUq7gBwAA", true);
  // wrong message for p2sh-multisig-2of2 full signature
  case("3Nye4j1GUFqCEBR3do2KEFZAs9oLe8NZ6X", "DAOHN7TAL75XRHJILGIO3RXAEM", "AgAAAAEvAyd4zsoz8gcVU5H19GLYokTAN5PxuKCBlEPjODJ86gAAAADaAEcwRAIgT6rcfxgCmG6b3DpzNV6UG0jiCQGclG9sfiSpV45HDXMCIGgtqjFBuJ7rbi+cgnG0TZiKZaxMk0KI+gQd0pHJfEYCAUgwRQIhANCvCLjGMuZMzH+nCEkNhWhR45T6QRYMLin8utpuF9r1AiBTjG2NLjkre7ec+HPg8UUhK1jL1vgq7YKjq5ROv+h07AFHUiEDhKjcb/Pv1/7AYutzOXwgec08wwD/VwiPm58Lc0xjohghAhycjpwdBuP33orQXAH1CAsrgSkuspxM2+FPQ4OCVhQWUq7gBwAAAQAAAAAAAAAAAWrgBwAA", true);
  // wrong signer for p2sh-multisig-2of2 full signature
  case("3L9uCVRBUfLgKQQK366dmutgsp3GpCwYGE", "7OKFLKRXSP6J42VQOMSG7MVXEP", "AgAAAAEvAyd4zsoz8gcVU5H19GLYokTAN5PxuKCBlEPjODJ86gAAAADaAEcwRAIgT6rcfxgCmG6b3DpzNV6UG0jiCQGclG9sfiSpV45HDXMCIGgtqjFBuJ7rbi+cgnG0TZiKZaxMk0KI+gQd0pHJfEYCAUgwRQIhANCvCLjGMuZMzH+nCEkNhWhR45T6QRYMLin8utpuF9r1AiBTjG2NLjkre7ec+HPg8UUhK1jL1vgq7YKjq5ROv+h07AFHUiEDhKjcb/Pv1/7AYutzOXwgec08wwD/VwiPm58Lc0xjohghAhycjpwdBuP33orQXAH1CAsrgSkuspxM2+FPQ4OCVhQWUq7gBwAAAQAAAAAAAAAAAWrgBwAA", true);

  // From https://github.com/bitcoin/bips/blob/master/bip-0322/basic-test-vectors.json

  // invalid base64 encoding
  case(SEGWIT_ADDRESS, "", "not-valid-base64!!!", false);
  // empty signature
  case(SEGWIT_ADDRESS, "", "", false);
  // empty witness stack (single zero byte)
  case(SEGWIT_ADDRESS, "", "smpAA==", false);
  // wrong message for valid simple p2wpkh signature (empty message was signed)
  case(SEGWIT_ADDRESS, "Wrong message that was not signed", "smpAkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI=", false);
  // wrong address for valid simple p2wpkh signature (signed for different address)
  case("bc1qp0ahvfh83088w49k405szqgg4f3pptr7p2g06tdxfjcd40z4lh4q95lsz9", "", "smpAkcwRAIgM2gBAQqvZX15ZiysmKmQpDrG83avLIT492QBzLnQIxYCIBaTpOaD20qRlEylyxFSeEA2ba9YOixpX8z46TSDtS40ASECx/EgAxlkQpQ9hYjgGu6EBCPMVPwVIVJqO4XCsMvViHI=", false);
  // wrong message for valid simple p2wsh 3-of-3 multisig signature
  case("bc1qp0ahvfh83088w49k405szqgg4f3pptr7p2g06tdxfjcd40z4lh4q95lsz9", "This is not the message that was signed", "smpBQBHMEQCIFX9aaqPJWq2Ff2kpen5bFDTid+ehgUOpHV0LfjncXy4AiA3GNicF7aKPzdpa9PCpmaYQs3pHd+qbvvhXdxOCKCAMAFIMEUCIQD/ELXg6CNYyUQijCg96JtgvgjZb9dsl1Ctof4QAeyTcQIgVM/1AAblFl/DCt6A1gJg+T/i2qU5SQD09+chFJzolRwBSDBFAiEAlqRfSFyWNVQhvaCnmeV5tyneiCWMTcFbuujoD/pFa3wCIGnZjfQb8NolSYq9asV+ZeBSkCGHJcqnaV4JYS5MYPEGAWlTIQJ1aLEfEi/4p7wcV+XHZCBVvGGJZ7L3v+jhH+mZA8lN0yECCovfec+kIdllXpKCgA8RX/HZ2x5yHOtCSKP8/sf6pnwhAwxSng6kCgCXXSAmJOOZFdr3vdK3HzGqCFloOHgc5fM6U64=", false);
}

#[test]
fn test_official_vector_prefix() {
  // official vector with no prefix fallback
  assert_valid(crate::verify::verify_simple_encoded(
    NO_PREFIX_ADDRESS,
    NO_PREFIX_MESSAGE,
    NO_PREFIX_SIGNATURE,
  ));

  // official vector with incorrect prefix type
  assert!(matches!(
    crate::verify::verify_simple_encoded(
      INCORRECT_PREFIX_ADDRESS,
      INCORRECT_PREFIX_MESSAGE,
      INCORRECT_PREFIX_SIGNATURE
    ),
    Verification::Invalid(Error::SignatureVariantMismatch { .. })
  ));

  // `foo` is not a known variant, so it fails to decode.
  assert!(matches!(
    crate::verify::verify_simple_encoded(SEGWIT_ADDRESS, "foo", "fooAA=="),
    Verification::Invalid(Error::SignatureDecode { .. })
  ));
}
