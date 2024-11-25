// import { Pressable, Text } from "react-native";
// import Container from "@/components/Container";
// // import { collection, getDocs, Firestore } from "firebase/firestore/lite";
// import { useFirebase } from "@/hooks/useFirebase";
//
// export default function Test() {
//   const { database } = useFirebase();
//
//   const testDb = async () => {
//     // Get a list of test from your database
//     async function getCities(db: Firestore) {
//       const citiesCol = collection(db, "test");
//       const citySnapshot = await getDocs(citiesCol);
//       const cityList = citySnapshot.docs.map((doc) => doc.data());
//
//       return cityList;
//     }
//
//     const data = await getCities(database);
//     console.log(data);
//   };
//
//   return (
//     <Container>
//       <Text>Press me to get data from db</Text>
//       <Pressable onPress={testDb}>
//         <Text>Test db</Text>
//       </Pressable>
//     </Container>
//   );
// }
