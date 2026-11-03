/* Basketball player pool. Ratings and market values are illustrative, not official NBA 2K data. */
const BASKETBALL_ROWS = `
Nikola Jokić|C|Denver Nuggets|99|58|RS|Nikola Jokić
Giannis Antetokounmpo|PF|Milwaukee Bucks|98|55|GR
Shai Gilgeous-Alexander|PG|Oklahoma City Thunder|98|54|CA
Luka Dončić|PG|Los Angeles Lakers|98|53|SI|Luka Dončić
Jayson Tatum|SF|Boston Celtics|97|52|US
Stephen Curry|PG|Golden State Warriors|97|50|US
Kevin Durant|SF|Houston Rockets|96|49|US
Joel Embiid|C|Philadelphia 76ers|96|48|CM
LeBron James|SF|Los Angeles Lakers|96|47|US
Anthony Edwards|SG|Minnesota Timberwolves|96|46|US
Victor Wembanyama|C|San Antonio Spurs|96|46|FR
Jalen Brunson|PG|New York Knicks|95|45|US
Devin Booker|SG|Phoenix Suns|95|44|US
Anthony Davis|PF|Dallas Mavericks|95|44|US
Donovan Mitchell|SG|Cleveland Cavaliers|95|43|US
Tyrese Haliburton|PG|Indiana Pacers|94|42|US
Ja Morant|PG|Memphis Grizzlies|94|41|US
Kyrie Irving|PG|Dallas Mavericks|94|40|AU
Trae Young|PG|Atlanta Hawks|94|40|US
Damian Lillard|PG|Milwaukee Bucks|94|39|US
Jaylen Brown|SG|Boston Celtics|93|38|US
Jimmy Butler|SF|Golden State Warriors|93|38|US
Paul George|SF|Philadelphia 76ers|93|38|US
Kawhi Leonard|SF|Los Angeles Clippers|93|37|US
Bam Adebayo|C|Miami Heat|92|36|US
De'Aaron Fox|PG|San Antonio Spurs|92|36|US
Paolo Banchero|PF|Orlando Magic|92|35|US
Karl-Anthony Towns|C|New York Knicks|92|35|DO
Domantas Sabonis|C|Sacramento Kings|92|35|LT
Tyrese Maxey|PG|Philadelphia 76ers|92|34|US
LaMelo Ball|PG|Charlotte Hornets|91|34|US
Chet Holmgren|C|Oklahoma City Thunder|91|33|US
Scottie Barnes|SF|Toronto Raptors|91|33|US
Jamal Murray|PG|Denver Nuggets|91|32|CA
Jaren Jackson Jr.|PF|Memphis Grizzlies|91|32|US
Alperen Şengün|C|Houston Rockets|91|32|TR|Alperen Şengün
Franz Wagner|SF|Orlando Magic|90|31|DE
Cade Cunningham|PG|Detroit Pistons|90|31|US
Darius Garland|PG|Cleveland Cavaliers|90|30|US
Pascal Siakam|PF|Indiana Pacers|90|30|CM
Lauri Markkanen|PF|Utah Jazz|90|30|FI
Brandon Ingram|SF|Toronto Raptors|90|29|US
Dejounte Murray|PG|New Orleans Pelicans|89|29|US
Mikal Bridges|SF|New York Knicks|89|29|US
Jalen Williams|SF|Oklahoma City Thunder|89|29|US
Desmond Bane|SG|Orlando Magic|89|28|US
Derrick White|SG|Boston Celtics|89|28|US
Jrue Holiday|PG|Boston Celtics|89|27|US
Rudy Gobert|C|Minnesota Timberwolves|89|27|FR
Kristaps Porziņģis|C|Boston Celtics|89|27|LV|Kristaps Porziņģis
Evan Mobley|PF|Cleveland Cavaliers|89|27|US
Jarrett Allen|C|Cleveland Cavaliers|88|26|US
DeMar DeRozan|SF|Sacramento Kings|88|26|US
Zach LaVine|SG|Sacramento Kings|88|26|US
Tyler Herro|SG|Miami Heat|88|25|US
Julius Randle|PF|Minnesota Timberwolves|88|25|US
Jalen Green|SG|Phoenix Suns|88|25|US
Amen Thompson|SG|Houston Rockets|88|24|US
Ausar Thompson|SF|Detroit Pistons|87|24|US
Brandon Miller|SF|Charlotte Hornets|87|24|US
Fred VanVleet|PG|Houston Rockets|87|24|US
CJ McCollum|SG|Washington Wizards|87|23|US
Anfernee Simons|PG|Boston Celtics|87|23|US
Josh Giddey|PG|Chicago Bulls|87|23|AU
Immanuel Quickley|PG|Toronto Raptors|87|23|US
Austin Reaves|SG|Los Angeles Lakers|87|23|US
Josh Hart|SF|New York Knicks|87|22|US
OG Anunoby|SF|New York Knicks|87|22|GB
Aaron Gordon|PF|Denver Nuggets|87|22|US
Keegan Murray|PF|Sacramento Kings|86|22|US
Clint Capela|C|Atlanta Hawks|86|21|CH
Myles Turner|C|Indiana Pacers|86|21|US
Nic Claxton|C|Brooklyn Nets|86|21|US
Walker Kessler|C|Utah Jazz|86|20|US
Naz Reid|C|Minnesota Timberwolves|86|20|US
Dereck Lively II|C|Dallas Mavericks|86|20|US
Jonathan Kuminga|SF|Golden State Warriors|86|20|CD
Brandin Podziemski|PG|Golden State Warriors|86|19|US
Russell Westbrook|PG|Denver Nuggets|86|19|US
Draymond Green|PF|Golden State Warriors|86|19|US
Klay Thompson|SG|Dallas Mavericks|86|19|US
Khris Middleton|SF|Washington Wizards|85|18|US
Jerami Grant|PF|Portland Trail Blazers|85|18|US
Brook Lopez|C|Milwaukee Bucks|85|18|US
Tobias Harris|PF|Detroit Pistons|85|18|US
Cam Thomas|SG|Brooklyn Nets|85|17|US
Devin Vassell|SG|San Antonio Spurs|85|17|US
RJ Barrett|SF|Toronto Raptors|85|17|CA
Jalen Johnson|PF|Atlanta Hawks|85|17|US
Zion Williamson|PF|New Orleans Pelicans|85|17|US
Michael Porter Jr.|SF|Brooklyn Nets|85|17|US
Alex Caruso|SG|Oklahoma City Thunder|85|16|US
Jakob Poeltl|C|Toronto Raptors|84|16|AT
Malik Monk|SG|Sacramento Kings|84|16|US
Herbert Jones|SF|New Orleans Pelicans|84|15|US
Jabari Smith Jr.|PF|Houston Rockets|84|15|US
Trey Murphy III|SF|New Orleans Pelicans|84|15|US
Dillon Brooks|SF|Houston Rockets|84|15|CA
Mark Williams|C|Charlotte Hornets|84|15|US
Scoot Henderson|PG|Portland Trail Blazers|84|14|US
`;
const BASKETBALL_PLAYERS=BASKETBALL_ROWS.trim().split('\n').map((row,id)=>{
  const [name,pos,club,ovr,value,country,wiki]=row.split('|');
  return {id,name,pos,club,ovr:Number(ovr),value:Number(value),country,wiki:wiki||name,rarity:Number(ovr)>=96?'titan':Number(ovr)>=92?'elite':Number(ovr)>=88?'rare':'gold'};
});
