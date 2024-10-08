import React from "react";
import { useTheme } from "@/hooks/useTheme";
import { HomeScreen } from "@/containers/HomeScreen";
import { ThemedText } from "@/components/ThemedText";
import { Link } from "expo-router";
import { View } from "react-native";

const routes = [
  {
    athlete: {
      id: 24005105,
      username: "akdsco",
      resource_state: 2,
      firstname: "Arkadiusz",
      lastname: "Ostrowski",
      bio: "",
      city: "London ",
      state: "England",
      country: "United Kingdom",
      sex: "M",
      premium: true,
      summit: true,
      created_at: "2017-08-07T10:02:23Z",
      updated_at: "2024-10-02T09:25:13Z",
      badge_type_id: 1,
      weight: 76.8,
      profile_medium:
        "https://dgalywyr863hv.cloudfront.net/pictures/athletes/24005105/6893424/3/medium.jpg",
      profile:
        "https://dgalywyr863hv.cloudfront.net/pictures/athletes/24005105/6893424/3/large.jpg",
      friend: null,
      follower: null,
    },
    description: null,
    distance: 86822.40459590193,
    elevation_gain: 710.4899999999999,
    id: 3272595607114048500,
    id_str: "3272595607114048478",
    map: {
      id: "r3272595607114048478",
      summary_polyline:
        "cutyHr{IyBPeABOL_@BYPUh@SJODYEQOS_@Ie@@YFWRc@Hy@@g@DWkAmI_Nmb@kC}HEKKIKYIWC[}AsEU{@WVsAyDaG_Ro@gDyC{JeDeKEIECQq@Ac@g@_BMQ}FmSk@cCe@yAu@gDmBqH{C{KWi@Kc@?OwDcOuAmGIOiBgJkAqIsBgIW}@q@wA}@}AuAuBu@y@q@oAmAmBK?YUI[]i@eBgCi@k@Ya@YWSa@]mAeAkFoA_H_@}AQe@a@k@kAsAeA}Ae@gA]iAOu@qBqHiBoGsDuJQI_@{@]k@QkAHED[As@Ec@Ii@iAgEoCsHOW_@aAqBuFg@_AC@IMIQ@G}@_AmCk@IGqDDq@Ec@GcCg@mCu@sC_AcKwDwOqGAOsCiAQ@iAk@w@[[IQ?uA`@o@\\m@LO?MEMKIQe@gA]aAi@eAY]YSq@WEHEA}F}BoCoAaEkCASmIoHwImHqF{E_@a@c@s@M@_@MmEkDaDyDOBc@YES{EeD]SOBYQEUq@]aHqE_CoBsCkBkDqBeD{AoDwAOBcFyA{CgAaEcBCMSIKBkBs@gAe@uAs@mBw@uBq@eB[o@IEIgVwEaF}@}Bm@oBa@yAa@ol@wNwHcB}FyAmAKaGaAqAO[M{AKyAQoDm@mBo@cCs@_\\sI}HoByDgAsPoEiJaC{B}@s@G[DOPQLUZ}@n@o@l@_DtGYV}@Rw@H_ARc@Ps@`@CIQEaC?qEw@cCg@yCc@u@q@}@cAUIk@c@cCmCgAuAgAkAu@q@mBk@]GaBi@gBcAM@gAmAaCkEe@iA}AyEwBmE}BwBm@EOJa@x@CEmA]}@g@qBeDkBiEg@}Aa@kCuAsGgByJqBuHq@oGwA{Lg@cCmAiIo@uBcAyGIWOEN{ECyAMy@Qc@w@kAyGyKeAoBm@qA_BaEqBkG_A_CaFeKkBgDwCiD}B_D{@{AgGkNeAmCgCiHaBuFmAcDe@yAeAoDcCiKuCgK_EsLmGuQsBoFaCiIqIu]w@{CWs@Ga@sBiIs@{B}@qBaCqEi@oAu@sBsCgJ_C{Gu@mBy@kBaA}A_@c@MEa@o@QOaBmBiEyFgDqFq@qAaA_C_BcDgCsDm@k@u@aAwH{GsAsAs@e@MSDS?YSyAiCuNuB}KaHc`@a@cBoDaMaAqDqCaOeBiLS}@W{@cDmJqBsGU_Aa@kCMsAo@oJQ}DIeFEgGBkCZ}LE{EU}L?eBBu@n@eHb@cHBm@@gBOqD}@yLIa@y@gCeFwLs@mAgAuAu@q@]WaBs@_@W_@e@o@oAa@g@i@[gAe@[YS_@Os@wGca@[kCQcDUkBa@wAc@_AsEcGgAqA{@y@w@m@_FmDiAmAcBaCg@OUAMFG?[a@_KcF{CoBaBuA{GuG{@m@uAg@eC_@_Bc@_E[k@@uAPuAXa@@w@MeBi@oEaBkEwAmCUgAYk@]uEqEwBeB}B]wD_AsAo@e@g@iDkIaBiE{AoDg@Y{BQgAY{@m@SYM{Ag@qOI{ECwGYkHOeASi@[]yF_Ae@[MUKiEOy@Me@_Ag@yECg@Ue@]Sa@Kk@]{EmAkJeAsGc@mBmAeDc@EUHqB|D_@\\wA^k@Cq@[_CuA_@C_@Jg@j@kAlC[b@[F]IuAyBo@w@wAoA_Bu@sC_BsCwAwI_GoB_BmDwDYc@k@uA_AsA_@]UMUGo@G}@BgB\\Y@k@SmF{BeJoEeASsA?iAEe@KWWqAsDYk@c@UcAGoFZyD`A}@\\o@b@sAhAQFUGQOESWuDO_A]m@o@g@iBSSSG]SmDG]g@a@i@UuBaByAQc@KgAKc@UuBiD}@y@eBuA_@XUtA]\\wA^MRMf@R|B?`CJrB@lC[~EE~A?lALhBr@fF@`BWdFB`@^zBXnDBlBI|AW~BGjAHjBhAzFDtACdDTpHFlD^fExB~KN|AOl@oBfBM\\Ax@`@lEBp@CPOTOL_Bt@q@j@k@v@y@jBY`@YPm@RQJKNi@tA_@jBwArCQn@a@_Bc@qAU[UQ_@O}AYg@EQ@SHe@^SFSAe@[w@aAm@g@}C{AYWq@{@WOkA]qBuAi@U{@B_AT[?{Bg@c@]sBmCWi@}@a@w@FWFWp@MhAIdBMn@[\\[FaCL{Fa@kAYg@@w@RoAj@m@l@oCtEg@`@}@d@kD|EcHxK_AhDW^a@Xw@Ic@?c@Le@\\g@bA]hAIr@Uh@o@x@wCxCUf@cAjGIROPc@HeABcC\\]JKPANDtAAPGRYRcBh@aCh@a@IqAHuDj@uAX_@Ns@jAKDQAKGyD{Ys@{E]iBy@gDa@kAqB{Bc@y@y@wBi@mBc@wB}A{IU{@Uc@_CeCk@{@q@mAi@sA}@aDqCuPeAgDiBeEeAgE[_BiCcKOeAYoDqAMBoCJaBlAoLn@B`A?aA?o@CQbBPcBn@BjFELFr@{@XSf@AlCz@VDh@IjD]vBy@|@QdBFeBG}@PwBx@kD\\i@HWEVDh@IjD]vBy@|@QnBFtAAv@O\\AR@\\Lf@b@vA~CdCrDVNh@?j@MtB[hGY`Fe@t@?nAn@vEtD\\\\b@F\\EtBkB~@iAdBcEj@eAZ_@r@i@z@Y|@G`Be@tG{BdAa@xAu@pDiAzBQ`Do@rCmAxAcArBq@`Ai@v@}@d@w@b@_B\\eAvAmDHy@IqBFo@Pe@tBmBrB{BzAeA`CwA~@e@ZI\\BRNXn@`@`@\\Lh@?pBSvAWxGsBhAg@lEyHvAsB`CcCdEcD|EeDbDeBrAiB^Yh@WzAYbAV~AJtBVxA`@x@\\PLr@t@~@pAzDhEb@ZtAv@|A|AtAd@~@n@z@`AvAd@v@f@b@`@lAX|ACNMbAkERe@f@o@z@w@t@g@`@Q\\CfA@fA\\r@l@v@vA|A|Ed@x@ZVVLbA?`@F^Th@f@j@V~D|@fBz@hApAxAz@b@d@h@|@tC~DfCpCn@l@n@L`@Gf@[vAgB\\Ud@?zDlAnD`AtCd@lBKlAYv@g@xAaBfBw@nB]tBL|AAbDq@d@Ch@RfBjAnBh@tARjA^hAi@d@Kr@EnBPrBdB^JdBJz@UpAaAt@KlBF`AL`@NxDbAr@VJ@ZGJILWP{@F_A@qAEu@VPh@R\\b@|@v@pAd@XTLP`@~@LLJn@HdAC~CBdA|AhFl@lF@t@XbAVp@t@dAt@zAfAlCLp@|@|@NVD\\GbBHTPDl@ElBUpABhBNpCDnB_@Vg@ZeBj@mBFKh@JxAt@Vj@Nz@L`DPt@Rd@nAdAl@~@v@z@`@NpAXPH^`@~@zAC`BLfB\\vBN`@ZXf@\\~@`BzBzCx@lAzBvEdAjCZ`Az@hAfAfB`@b@pA`Af@p@JH^{BnDqPv@}Cr@{BPLxA@tBMxT~@|@?xAQhCe@^BPXH`@NhBJXTNnJm@p@?`ATbFjBpEjB^F^C\\Ob@GxEa@xBJxBKpAYfEe@VdAn@jBlArEdAvFzDvQj@zB~B`LX`BZlC`@pBr@`Bz@|A\\FLKzAeD^a@\\GPFtHjHp@NxCZrD?xAW\\BZJVT^x@J^BdAQfFAvPP`GC~GHjDC~@Q~BSjAEdAHdDHvAx@|K`@`CNtAHzAZxC[xEQbFAbHUrIA|FKjAoAhIAf@B^Pr@zAzBdFzGnBrC|@~@jCfDtBfDvA~AjCtDfEnFrGbJ|C`EHX@ZEf@wBpJa@xBQvACb@BzFLfGQjDYnDOlCArADr@HRp@|@n@n@lFtErAt@vAp@lBv@~Cz@LHT^DRB`@eAfE[x@}@pCmA|EqA|D_@pBGt@AvBHfCN~B`@bEZKb@DZTjDtDnD|CjBrBxBlCj@l@dCzBpExD`GhGrA`A~@`@x@Pn@F`@@bAGhAW`S_HhBa@jD]lBWvBk@fBm@pAUr@Qp@YhAq@jBy@^IbC[zAe@dFwCbB}Ah@q@f@WLANBbAZ|@@nIq@rDi@v@Gl@?~@ThCdAt@p@pAdQvAbOd@dEf@vBHl@Nj@DDRFN@nBY|A[~@CNFz@dAxAlA^^X^R^^nAx@`DlAtD`@|AvApEp@~CPd@xBbDxBnDzA|CfAxA|@|AbExEPv@n@WzBoAzB}AjEcDTKf@KTMZh@\\ZXNvAFRDNHxAbIdAhIb@lENfARx@d@bBdC`H`CfHnAdEpCvFr@pBxBpFxA~ClArBb@ZVDHANJNf@h@|@jAnAbCtCj@`Ah@xAx@vCf@zAl@tA|AxCtA|BrAnCpBnE|@bBl@~@bCbDh@l@dGdFtCxCdAnAn@nAz@bCRx@LpAInEOjE@RzBhIb@tAR^RPRHX@bACd@DpJnA|@Zj@j@xBvCTTjMxElB^NHHJPMJJBPx@HhCd@nB`@ZNbAbAtAdB|@xAbAtAbGlHrFfHhFlFfDrCdAr@f@d@jA~@pCrBlBhBvEzEPVdIhJ`C~DlAtAnBlCvCzEf@xAZbC|@nFzBpKhCbLdA~CxBzF~@hBrE|DvBbCf@f@z@dBvAbCRLNBFADBBFHB`@vALTTjAnA|R~BtMv@jCnA|CpBxDdEbE~FhHt@hAfAdCF?NVAPWl@?LYn@]vAgAbIyGbb@_Jlj@_AnESl@y@zAi@l@cDfCqApAm@p@a@l@gArBMh@e@pA{BxKAPDb@zEdDDRb@XNCnB`Cv@j@bA`@f@Jl@D~AARLJP@^Gn@Dl@Fn@JN|FdFvIlHrHxGzEdDpCnAzH|CXIz@e@`AYZQ~@YNANBLJHL^|@~@|C^v@nAr@`Ad@NRfSfIhLlEvDjAjBf@xCl@l@HnEIr@Dd@JJERFf@Xt@l@TXv@zArAfDtA~D|BbGHBb@|@Lb@d@vCHlA@dBJp@bGfPn@hCJJTp@v@pC\\|AhAlDVfAdAdBNFTTDRf@j@n@bAbAvFlCrMLRrAtAbDxEn@Zn@zAhBnCBFCFvCzEn@nAZ`AjAlEd@tB|AnKl@tCfC`LdDtM^dBrDnMhDbN\\~AjApErD~L`@lA^t@f@fBn@tClHnU|@~CnAnDd@~A|EbOTz@|ArEJHVt@@VpChIjMx`@Rr@jAlIHBd@tAf@l@dAbAdACxBQj@Q",
      resource_state: 2,
    },
    map_urls: {
      url: "https://d3o5xota0a1fcr.cloudfront.net/v6/maps/UFVEKL3FNRO76Q7HFCJJ73BNFY4SVVG23X366R4BSQUKBPDNEMQJ4SZ4N42ANXL3XHW64FBTGM25BSXNOZ2JXTYEBLDYFC4NBQUTYEA=",
      retina_url:
        "https://d3o5xota0a1fcr.cloudfront.net/v6/maps/UCBNJ53OGAWEHM5554YNCPHEPJB4SMTMTKHT7HJHDFZPRYCNMJ4C6NJ5RBC3JHF7QCBII4THQJCWEINMQDYASGK6ZIIV3TJMUPFOVCI=",
      light_url:
        "https://d3o5xota0a1fcr.cloudfront.net/v6/maps/UCBNJ53OGAWEHM5554YNCPHEPJB4SMTMTKHT7HJHDFZPRYCNMJ4C6NJ5RBC3JHF7QCBII4THQJCWEINMQDYASGK6ZIIV3TJMUPFOVCI=",
      dark_url:
        "https://d3o5xota0a1fcr.cloudfront.net/v6/maps/3IQKF3L74FZNXEHXK4FONGOKCIUTFZLG2DG3USQ7CLRWFJHTXNCW5UJFALY4PCHK6MJNTRRQHI53VBJYRI7VC7GGNXQP7YANME4PHHA=",
    },
    name: "HVCC Cappuccino 18th Nov 2023",
    private: false,
    resource_state: 2,
    starred: true,
    sub_type: 1,
    created_at: "2023-11-11T17:34:43Z",
    updated_at: "2024-09-21T15:26:35Z",
    timestamp: 1699724083,
    type: 1,
    estimated_moving_time: 11385,
    waypoints: [],
  },
  {
    athlete: {
      id: 313647,
      username: "stua",
      resource_state: 2,
      firstname: "Stu",
      lastname: "Anderson // Band of Climbers",
      bio: "Chief Rouleur at Band of Climbers.  Will ride for Coffee and Cake.",
      city: "Newcastle Upon Tyne",
      state: "Tyne and Wear",
      country: "United Kingdom",
      sex: "M",
      premium: true,
      summit: true,
      created_at: "2012-03-09T10:53:59Z",
      updated_at: "2024-10-07T10:51:41Z",
      badge_type_id: 1,
      profile_medium:
        "https://dgalywyr863hv.cloudfront.net/pictures/athletes/313647/24434949/2/medium.jpg",
      profile:
        "https://dgalywyr863hv.cloudfront.net/pictures/athletes/313647/24434949/2/large.jpg",
      friend: null,
      follower: null,
    },
    description: "",
    distance: 99772.22271797134,
    elevation_gain: 3120.2378199547284,
    id: 2724050185289942000,
    id_str: "2724050185289941916",
    map: {
      id: "r2724050185289941916",
      summary_polyline:
        "irvdItwhHwCuBaD~A}@lJqHzQqH}@mEvHkDhOuF_D_QrCyEiJgY}L@mF_EkNjBcLmEmHiNlEqHm\\uMcKFvh@~CrQk@~f@wEjSNrXqBnHbAbOgDdL{@|]eKdMwU}Qx@lQsCuEsd@_Z~DsVaxA{Q}LpIwGeEgCv{ByK_@_Nou@cAkTeIsCqNaOdEaJy@}@NsD|AqEoDoDl@eLbDuGk@{DbEeGsEsJgIrWyMlM~F~ZfCvFpC`]kAbKgClDqExAqD}DwBfNwIrC]d[zAlWRvb@u@jXfE`YcKfQwFdXuOeXmTmj@sE}AuKmTaAcXgBqEsCy@oCbXcM~UFf\\yEdQwHxOs@tOeCbAwDpIO|S_AbD}C}AgAcOaJ|AoIt\\wDjHuF{BuBuG{FRwUlj@aFg\\aJcPsD_UaOwGqFkIsGm@mFhWoJZeIpVoBhB]kMiHeS_OrIoFaE{@yEqH{BkDx^aFjWYn]gZtaA~NhNdHzCvERxFsErMj@~FpJpB}Ad@bRvLjJvA~Ps@rLf@xBzDqDi@tHoHxOiCMwBzC|@pEmBpZiLxf@lF{@vM`OpJ~T`NbDth@gn@fM}E~B`LdEuGrFiAfGaG`HgS~@bFjAEbFgQzMzNvEt@rVK`P}KnAeTaJa]zD{FrFlFdFgNlIoLdFuNhE{b@_G{O_ExGwHxB{BwFyAJwDjCYbD_ErFsEoH|Jyt@pAoDhC`@^eCZ_\\oAiJHsJr@uK`CwEa@bFzMrPjLuCqDjQ{E|m@hGp_@ze@hWcNtuAqMnVnP{BpH{KzMcH|BpHy@~S|@jL~No\\bF_BvXtCxQjInDfFjAiC{Dkt@bGyy@pBuGbVkHfLmN]yLrB{GC_GuEd@yQmR{CqIeBiOv@mIeEuA_AuFjFcq@zP_l@lCyx@vHXx@vDpKM`B|G|BjBtToDtCpEfNkLa@dMdLhKv@nDgBhVzApX\\kJ~EtKdOmQxH}EzEbE`G_@fCfDjUm@jW~cAvB`@vLgG`SeAyJzxAsCdfDgB`d@rFXD`KpCfCbAdb@lNxt@xJfy@t@j[~Gza@bBz_@pD`KpX~Ob@jLpFj[zH~M~F|YlK{F~MrJpQK~JzCvWiApWqd@tH{a@bRum@k@eXkFyMjJu`@PeF{Gm[rDFlHqE|F`GxH|Bpt@fFnj@aVrGdJdCqIXmUmCcd@{G{HHwe@xBuQoGce@DuUaAsBoB`@iGfIsP`K{TXyF_Fc@kThB}RvDwLvHgK~@uJDo\\m@uDoEaGxYhV|ExPhI`N|Kl@bGzXpNhOdEnOr[bd@JaQtBgGp_@}^\\cDw@gOeIi`@{Zk_AdTca@`DyLwNia@gCs[EalAoD}KuQqJoHiNkKeFwPkTeLoGxBZQ_PiFyPm@k[tDuY\\iPqGoOoAwJkp@jlBuJd@aNlMgKqEiEyu@oMmQ}MwG_F_KeEdGlA|NkOsA~@hDM`JcLxg@yDuEcF_XbAsTw@_FVoYuBeQuBqDmDek@sEqOkBgTyCcLcAaVeCqC",
      resource_state: 2,
    },
    map_urls: {
      url: "https://d3o5xota0a1fcr.cloudfront.net/v6/maps/ZCVA6QXVS77HL47HS47PK3XXCFA77XMZDHB7GKR66U3WIGGXSXMMXPYWOPHJCTHB5I5UL3C23IFUWL7FBPCMY7KGH5N4FE3J3VJFQRA=",
      retina_url:
        "https://d3o5xota0a1fcr.cloudfront.net/v6/maps/L7AGNC4OFYOSTPX4KG622DJYX7QBMNR466VC6LHV6VTTSLIOV22CZYFSOKH35Z7ZK72JD7NCTCVUU3IPZ65KXAX42GO22OTL6OWVLMY=",
      light_url:
        "https://d3o5xota0a1fcr.cloudfront.net/v6/maps/L7AGNC4OFYOSTPX4KG622DJYX7QBMNR466VC6LHV6VTTSLIOV22CZYFSOKH35Z7ZK72JD7NCTCVUU3IPZ65KXAX42GO22OTL6OWVLMY=",
      dark_url:
        "https://d3o5xota0a1fcr.cloudfront.net/v6/maps/ONV7DPOGXQYGB2YSVVFTBTVXL7MRGZUKHLA462MBYQTRULO6YRLM774AGWG5FYHKG5EHK7X67OSZGB6BKIQN3HCAOKZM3W5L2TA7DEQ=",
    },
    name: "Toughest 100km Route in the UK?",
    private: false,
    resource_state: 2,
    starred: true,
    sub_type: 1,
    created_at: "2020-07-30T22:42:54Z",
    updated_at: "2024-09-06T18:26:32Z",
    timestamp: 1596148974,
    type: 1,
    estimated_moving_time: 13083,
    waypoints: [],
  },
];

export default function Index() {
  const [theme] = useTheme();

  const noRoutesAvailable = false;

  if (noRoutesAvailable) {
    return (
      <HomeScreen>
        <View style={{ marginTop: 140 }}>
          <Link
            href={{ pathname: "/authorise" }}
            style={{
              width: "100%",
              textAlign: "center",
              padding: 20,
              borderWidth: 1,
              borderColor: "green",
            }}
          >
            <ThemedText>Add routes</ThemedText>
          </Link>
        </View>
      </HomeScreen>
    );
  }

  return (
    <HomeScreen>
      <View style={{ backgroundColor: "black" }}>
        {routes.map((route) => (
          <View key={route.id} style={{ padding: 20 }}>
            <ThemedText>{route.name}</ThemedText>
          </View>
        ))}
      </View>
    </HomeScreen>
  );
}
