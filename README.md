# 100km <https://eltorio.github.io/100km/>
Démonstration basique de l'affichage de la zone de 100km ⋃ Département à partir d'une adresse.
Démo à <https://eltorio.github.io/100km/>
L'adresse est géocodée puis un cercle est fusionné avec le département.

# Fonctionnement
Le fonctionement est simple soit l'adresse est geocodée depuis le paramètre a= de l'url exemple
[https://eltorio.github.io/100km/?a=18 route notre dame de la gorge, les contamines-montjoie](https://eltorio.github.io/100km/?a=18%20route%20notre%20dame%20de%20la20gorge,20les20contamines-montjoie)

soit si le paramètre a= n'est pas fourni une popup demande de saisir l'adresse.
Les adresses sont celles admises sur <https://api-adresse.data.gouv.fr> , en général ce qui fonctionne bien est une simple adresse:
numéro type_voie nom_voie, ville
la virgule séparant la ville et la partie rue.

En cliquant sur la carte le rayon est calculé dynamiquement.

# Couches
Les couches affichées sont : Géoportail cartes IGN, Géoportail satellites, Géoportail aviation OACI.
Pour intégrer dans votre propre site web demandez une clef api à <contact.geoservices@ign.fr>

un fichier est manquant: keys.js il sert à définir 3 variables:
```javascript
var clefGeoportail = "votreclef"; 
var getUrlDepartement = function(insee_code) {
    var filterDepartement = `Filter=<Filter><PropertyIsEqualTo><PropertyName>INSEE_DEP</PropertyName><Literal>${insee_code}</Literal></PropertyIsEqualTo></Filter>`;
    var urlDepartement = `https://votre.serveur.wfs/wfsmap?SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=ms:DEPARTEMENTS&SRSNAME=EPSG:2154&${filterDepartement}&outputFormat=geojson`;
    return urlDepartement;
}

var getUrlPays = function(iso_code) {
    var filterPays = `Filter=<Filter><PropertyIsEqualTo><PropertyName>CNTR_ID</PropertyName><Literal>${iso_code}</Literal></PropertyIsEqualTo></Filter>`;
    var urlPays = `https://votre.serveur.wfs/wfsmap?SERVICE=WFS&VERSION=1.0.0&REQUEST=GetFeature&TYPENAME=ms:PAYS&SRSNAME=EPSG:4326&${filterPays}&outputFormat=geojson`;
    return urlPays;
}
```
Si vous ne fournissez pas ces définitions elles sont substituées par des valeurs par défaut: la clef est celle du Géoportail, les fichiers de géométries ne sont alors plus obtenus depuis un serveur WFS mais lus depuis les fichiers statiques présents dans ./geobase/ , ex: geobase/INSEE_DEP_74.json . Les départements sont encodés avec des coordonnées projetées en [RGF93 (EPSG:2154)](https://epsg.io/2154).
```javascript
var clefGeoportail = (typeof clefGeoportail === 'undefined') ? realGeoportailAPIKey : clefGeoportail;
var getUrlDepartement = (typeof getUrlDepartement === 'undefined') ? function(insee_code){ 
                                            return `geobase/INSEE_DEP_${insee_code}.json`;  }
                                                                : getUrlDepartement ;
var getUrlPays = (typeof getUrlPays === 'undefined') ? function(iso_code){ 
                                            return `geobase/PAYS_${iso_code}.json`;  }
                                                                : getUrlPays ;
```
