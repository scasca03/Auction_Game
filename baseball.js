/* Baseball player pool. Ratings and market values are illustrative, not official data. */
const BASEBALL_ROWS = `
Shohei Ohtani|DH|Los Angeles Dodgers|99|58|JP|Shohei Ohtani
Aaron Judge|RF|New York Yankees|99|57|US
Juan Soto|RF|New York Mets|98|56|DO
Bobby Witt Jr.|SS|Kansas City Royals|98|55|US
Mookie Betts|SS|Los Angeles Dodgers|97|53|US
José Ramírez|3B|Cleveland Guardians|97|52|DO|José Ramírez (infielder)
Ronald Acuña Jr.|RF|Atlanta Braves|96|50|VE
Freddie Freeman|1B|Los Angeles Dodgers|96|49|US
Gunnar Henderson|SS|Baltimore Orioles|96|49|US
Kyle Tucker|RF|Chicago Cubs|96|48|US
Yordan Alvarez|DH|Houston Astros|96|48|CU
Vladimir Guerrero Jr.|1B|Toronto Blue Jays|95|46|DO
Elly De La Cruz|SS|Cincinnati Reds|95|46|DO
Corey Seager|SS|Texas Rangers|95|45|US
Francisco Lindor|SS|New York Mets|95|45|PR
Tarik Skubal|SP|Detroit Tigers|95|45|US
Paul Skenes|SP|Pittsburgh Pirates|95|44|US
Zack Wheeler|SP|Philadelphia Phillies|94|43|US
Corbin Carroll|RF|Arizona Diamondbacks|94|43|US
Rafael Devers|3B|San Francisco Giants|94|42|DO
Bryce Harper|1B|Philadelphia Phillies|94|42|US
Ketel Marte|2B|Arizona Diamondbacks|94|42|DO
Gerrit Cole|SP|New York Yankees|94|41|US
Chris Sale|SP|Atlanta Braves|94|41|US
William Contreras|C|Milwaukee Brewers|93|40|VE
Adley Rutschman|C|Baltimore Orioles|93|40|US
Austin Riley|3B|Atlanta Braves|93|40|US
Matt Olson|1B|Atlanta Braves|93|39|US
Julio Rodríguez|CF|Seattle Mariners|93|39|DO
Trea Turner|SS|Philadelphia Phillies|93|39|US
Manny Machado|3B|San Diego Padres|93|38|DO
J.T. Realmuto|C|Philadelphia Phillies|92|37|US
Marcus Semien|2B|Texas Rangers|92|37|US
Jose Altuve|2B|Houston Astros|92|37|VE
Randy Arozarena|LF|Seattle Mariners|92|36|CU
Jazz Chisholm Jr.|2B|New York Yankees|92|36|BS
Logan Webb|SP|San Francisco Giants|92|36|US
Yoshinobu Yamamoto|SP|Los Angeles Dodgers|92|36|JP
Zac Gallen|SP|Arizona Diamondbacks|92|35|US
Framber Valdez|SP|Houston Astros|92|35|DO
Garrett Crochet|SP|Boston Red Sox|92|35|US
Jackson Merrill|CF|San Diego Padres|91|34|US
Pete Alonso|1B|New York Mets|91|34|US
Ozzie Albies|2B|Atlanta Braves|91|34|CW
Bo Bichette|SS|Toronto Blue Jays|91|33|US
Christian Yelich|LF|Milwaukee Brewers|91|33|US
Kyle Schwarber|DH|Philadelphia Phillies|91|33|US
Luis Arraez|2B|San Diego Padres|91|32|VE
George Kirby|SP|Seattle Mariners|91|32|US
Pablo López|SP|Minnesota Twins|91|32|VE
Max Fried|SP|New York Yankees|91|32|US
Jarren Duran|LF|Boston Red Sox|90|31|US
Brent Rooker|DH|Oakland Athletics|90|31|US
Alex Bregman|3B|Boston Red Sox|90|31|US
Will Smith|C|Los Angeles Dodgers|90|30|US
Steven Kwan|LF|Cleveland Guardians|90|30|US
Anthony Santander|RF|Toronto Blue Jays|90|30|VE
Riley Greene|LF|Detroit Tigers|90|29|US
Michael Harris II|CF|Atlanta Braves|90|29|US
Shane McClanahan|SP|Tampa Bay Rays|90|29|US
Cole Ragans|SP|Kansas City Royals|90|29|US
Hunter Greene|SP|Cincinnati Reds|90|28|US
Tyler Glasnow|SP|Los Angeles Dodgers|90|28|US
Matt Chapman|3B|San Francisco Giants|89|28|US
Christian Walker|1B|Houston Astros|89|28|US
Dansby Swanson|SS|Chicago Cubs|89|27|US
Cal Raleigh|C|Seattle Mariners|89|27|US
Seiya Suzuki|RF|Chicago Cubs|89|27|JP
Byron Buxton|CF|Minnesota Twins|89|26|US
Eugenio Suárez|3B|Arizona Diamondbacks|89|26|VE
Oneil Cruz|SS|Pittsburgh Pirates|89|26|DO
Teoscar Hernández|RF|Los Angeles Dodgers|89|26|DO
Nico Hoerner|2B|Chicago Cubs|88|25|US
Bryan Reynolds|LF|Pittsburgh Pirates|88|25|US
Salvador Perez|C|Kansas City Royals|88|25|VE
Willy Adames|SS|San Francisco Giants|88|25|DO
Josh Naylor|1B|Arizona Diamondbacks|88|24|CA
Ryan Helsley|RP|St. Louis Cardinals|88|24|US
Emmanuel Clase|RP|Cleveland Guardians|88|24|DO
Devin Williams|RP|New York Yankees|88|24|US
Andrés Muñoz|RP|Seattle Mariners|88|23|MX
Jhoan Duran|RP|Minnesota Twins|88|23|DO
Raisel Iglesias|RP|Atlanta Braves|87|22|CU
Mason Miller|RP|Athletics|87|22|US
Josh Hader|RP|Houston Astros|87|22|US
Jeff Hoffman|RP|Toronto Blue Jays|87|21|US
Robert Suarez|RP|San Diego Padres|87|21|VE
Clay Holmes|SP|New York Mets|86|20|US
Tanner Bibee|SP|Cleveland Guardians|86|20|US
Shota Imanaga|SP|Chicago Cubs|86|19|JP
Luis Castillo|SP|Seattle Mariners|86|19|DO
Reynaldo López|SP|Atlanta Braves|85|18|DO
Kodai Senga|SP|New York Mets|85|18|JP
Lars Nootbaar|LF|St. Louis Cardinals|85|17|US
Anthony Volpe|SS|New York Yankees|85|17|US
Masyn Winn|SS|St. Louis Cardinals|85|17|US
Wyatt Langford|LF|Texas Rangers|85|17|US
Willson Contreras|C|St. Louis Cardinals|84|16|VE
Spencer Steer|1B|Cincinnati Reds|84|16|US
Brandon Nimmo|CF|New York Mets|84|15|US
`;
const BASEBALL_PLAYERS=BASEBALL_ROWS.trim().split('\n').map((row,id)=>{
  const [name,pos,club,ovr,value,country,wiki]=row.split('|');
  return {id,name,pos,club,ovr:Number(ovr),value:Number(value),country,wiki:wiki||name,rarity:Number(ovr)>=96?'titan':Number(ovr)>=92?'elite':Number(ovr)>=88?'rare':'gold'};
});
