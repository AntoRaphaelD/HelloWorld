#include <iostream>
using namespace std;

string decode(string &s, int &i) {
        string ans = "";

        while(i < s.size() && s[i] != ']'){
            if(s[i] >= '0' && s[i] <= '9'){
                int num = 0;
                while(i < s.size() && s[i] >= '0' && s[i] <= '9'){
                    num = num * 10 + (s[i] - '0');
                    i++;
                }

                i++;
                string temp = decode(s,i);
                i++;
                for(int k=0;k<num;k++){
                    ans += temp;
                }
            }else{
                ans += s[i];
                i++;
            }
        }
        return ans;
}















//     string ans = "";

//     while (i < s.length() && s[i] != ']') {

//         if (s[i] >= '0' && s[i] <= '9') {

//             int num = 0;

//             // Read complete number (supports multi-digit)
//             while (i < s.length() && s[i] >= '0' && s[i] <= '9') {
//                 num = num * 10 + (s[i] - '0');
//                 i++;
//             }

//             i++; // Skip '['

//             string temp = decode(s, i);

//             i++; // Skip ']'

//             for (int j = 0; j < num; j++) {
//                 ans += temp;
//             }
//         }
//         else {
//             ans += s[i];
//             i++;
//         }
//     }

//     return ans;
// }

int main() {

    string s = "12[a]3[xyz]";


    // cin >> s;

    int i = 0;

    cout << decode(s, i);

    return 0;
}