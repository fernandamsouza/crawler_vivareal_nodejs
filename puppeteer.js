const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const puppeteer = require('puppeteer');
// const cheerio =  require("cheerio");
var fs = require('fs');
var readline = require('readline-sync');


// Função que clica e espera a abertura de nova aba
let clickAndWaitForTarget = async (clickSelector, page, browser) => {
  const pageTarget = page.target();
  await page.click(clickSelector);
  const newTarget = await browser.waitForTarget(target => target.opener() === pageTarget);
  const newPage = await newTarget.page();

  newPage.setViewport({
   width: 1920,
   height: 1080,
   isMobile: false
  });
  await newPage.waitForSelector("body");
  return newPage;
};

async function vivareal_crawler(nomeBairro, nomeCidade, readline) {
  try {
    var list = [];
    const bairro = nomeBairro;
    const cidade = nomeCidade;
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    page.setViewport({
    width: 1920,
    height: 1080,
    isMobile: false
    });
    await page.goto("https://www.vivareal.com.br/", {waitUntil: 'networkidle2'});
      // Filtragem para modo de imovel. A princípio -> Alugar
      await page.click('.js-select-business');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');

      // // Filtragem para mostrar todos os anúncios. A princípio -> Mostrar todos.
      // await page.click('.js-select-type');
      // await page.keyboard.press('ArrowUp');
      // await page.keyboard.press('Enter');

      // Filtragem por cidade
      // Digita o nome da cidade no campo
      await page.type('input[id="filter-location-search-input"]', cidade, {delay: 200});
      
      // Filtragem por bairro
      if (nomeBairro != 'vazio') {
        // Digita o nome do bairro no campo
        await page.type('input[id="filter-location-search-input"]', bairro, {delay: 300});
      }

      // Enter na busca
      await page.type('input[id="filter-location-search-input"]', String.fromCharCode(13), {delay: 200});

      // Filtragem para mostrar todos os imóveis
      await page.waitFor(1500);
      let selector = 'li[data-filter="unitTypes=APARTMENT|UnitSubType_NONE,DUPLEX,LOFT,STUDIO,TRIPLEX|RESIDENTIAL|APARTMENT"]';
      await page.click(selector);

      // Aguarda e retorna o número total de imóveis
      // 'div[data-index="0"] > article > .property-card__main-info > a > div > div.carousel__container.js-carousel-scroll > div:nth-child(1) > img'
      await page.waitForSelector('div[data-index="0"] > article > .property-card__main-info > a > div > div.carousel__container.js-carousel-scroll > div:nth-child(1) > img');
      let total_imoveis = await page.evaluate(() => {
          let n = document.querySelector('div[class="results-summary__data"] > h1 > strong').innerText;
          return n
      });

      // Parseia o numero de imoveis
      total_imoveis = total_imoveis.replace(/\D/g,'');
      total_imoveis= parseInt(total_imoveis,10);
      console.log("Número de imóveis disponíveis em " + bairro + ": " + total_imoveis);

      // Calcula o numero de páginas totais
      n_pag_total = Math.floor(total_imoveis/35);
      n_imov_ultima=total_imoveis%35;
      if (n_imov_ultima != 0) {
          n_pag_total++;
      }

      console.log("Número de páginas: " + n_pag_total +'\n');
      n_pag = readline.questionInt("Digite o numero de paginas a serem pesquisadas:")
      console.log("Número de páginas selecionadas: " + n_pag);

      // Iterando entre as páginas selecionadas pelo usuário.
      for (var j = 1; j <= n_pag; j++) {
          if (j > 1) {
          await page.click('div[class="js-results-pagination"]>div>ul>li>a[data-page="'+j+'"]',{ waitUntil: 'networkidle2'});
          }

      // Iterando os imóveis em cada pagina -> Máximo 35 anúncios por página.
      for (var i = 0; i <= 35; i++) {
        if (i == total_imoveis-1) {
          break;
        } else {
        await page.waitForSelector('div > article > div.property-card__main-info > a > div > div.carousel__container.js-carousel-scroll > div:nth-child(1) > img');
        // Abertura de uma nova guia a cada anúncio da página
        page2 = await clickAndWaitForTarget('div[data-index="'+ i +'"]> .property-card__container > .property-card__main-info', page, browser);
        // Foco na página do anúncio
        await page2.bringToFront();
        let el = await page2.evaluate(() => {
          // Coleta do título do anúncio
          let titulo = document.querySelector('div[class="title__content-wrapper"] > h1').innerText;
          // Coleta do preço de aluguel
          let aluguel = document.querySelector('div > h3[class="price__price-info js-price-sale"]');
          if (aluguel != null) {
            aluguel= aluguel.innerText;
          }
          // Coleta do preço de condomínio
          let condominio = document.querySelector('div[class="price__cta-wrapper"]>ul>li>span[class="price__list-value condominium js-condominium"]');
          if (condominio!=null) {
            condominio=condominio.innerText;
          }
          // Coleta do preço de iptu
          let iptu = document.querySelector('div[class="price__cta-wrapper"]>ul>li>span[class="price__list-value iptu js-iptu"]');
          if (iptu!=null) {
            iptu=iptu.innerText;
          }
          // Coleta do número de quartos
          let n_quartos = document.querySelector('div[class="js-features"]>ul>li[title="Quartos"]');
              if (n_quartos!=null) {
            n_quartos=n_quartos.innerText;
          }
          // Coleta do número de banheiros
          let n_banheiros = document.querySelector('div[class="js-features"]>ul>li[title="Banheiros"]');
          if (n_banheiros != null) {
            n_banheiros = n_banheiros.innerText;
          }
          // Coleta do número de vagas de garagem
          let vagas_garagem = document.querySelector('div[class="js-features"]>ul>li[title="Vagas"]');
          if (vagas_garagem != null) {
            vagas_garagem = vagas_garagem.innerText;
          }
          // Coleta da descrição do imóvel
          let descricao = document.querySelector('div > p[class="description__text"]');
          if (descricao != null) {
            descricao = descricao.innerText;
            descricao = descricao.replace(/\r?\n|\r/g, " "); // Limpar o texto -> identificar \n e substituir.
          }
          // Coleta do endereço do imóvel
          let endereco = document.querySelector('div > p[class="title__address js-address"]');
          if (endereco != null) {
            endereco = endereco.innerText;
          }
          // Coleta do creci do anunciante
          let creci = document.querySelector('strong[class="creci"]');
          if (creci != null) {
            creci = creci.innerText;
          }
          // Retorno dos dados.
          return { titulo, aluguel, condominio, endereco, iptu, n_quartos, vagas_garagem, n_banheiros, descricao, creci };
          });

          // Descobrir quantidades de fotos do anúncio
          // const html = await page2.evaluate(() => document.body.innerHTML);
          // const $ = await cheerio.load(html);
          //const conteudoTotal = $('#js-site-main > div.hero.js-hero > div.hero__actions.js-actions > button > span').text();
          // const numero_imagens = returnMatches(conteudoTotal, /\d+/);
          // console.log(numero_imagens);

          // Coleta do link das imagens
          const listaIbagens = [];
          const ibagens = await page.$$eval('img[src^="https://resize"]', aTags => aTags.map(a => a.getAttribute("src")));
          listaIbagens.push(ibagens);
          //console.log(ibagens);

      //   // Filtragem número de celular do anunciante (EM PRODUÇÃO)
      //   await page.waitFor(2000);
      //   let selector = '#js-site-main > div.js-fullscreen-lead-vue.fullsized-lead.vue-lead-form > div > section > div > div:nth-child(1) > header > div > button';
      //   await page2.click(selector, {sleep: 1200});
      //   let el2 = await page2.evaluate(() => {
      //     let numeroCelular = document.querySelector('a[class="post-lead-success__link"]');
      //     if (numeroCelular != null) {
      //       numeroCelular = numeroCelular.innerText;
      //     }
      //     return {numeroCelular};
      // });

      const pagina = 'VivaReal';
      el = Object.assign({'pagina': pagina,
                        'bairro': bairro,
                        'id': j,
                        'url_imagens': listaIbagens}, el);
      j = j + 1;
      list.push(el);
      console.log(el);
      await page2.close();
      }
    }
    }
    await browser.close();

    // Salvar resultado em um arquivo out.json
    fs.writeFile("out.json", JSON.stringify(list,null,2), function(err) {
        if (err) {
            console.log(err);
        }
    });
    console.log('Imóveis coletados com sucesso!');
  } catch(err) {
  console.error(err);
  }
}

// Seletor de cidade
    console.log('\nSelecione a cidade para busca:\n');
    const cidade = readline.prompt();
    console.log('\nCidade escolhida: ' + cidade+'\n');

    console.log('Deseja filtrar por algum bairro? (S ou N)\n');
    const verificadorBairro = readline.prompt();
    let bairros;

    if (verificadorBairro == 'S') {
// Seletor de bairros
          console.log('\nSelecione o bairro para busca:\n');
          bairros = readline.prompt();
          bairros = ' - ' + bairros;
          console.log('\nBairro escolhido: ' + bairros+'\n');
    } else {
      bairros = 'vazio';
    }

// Implementação escolha do tipo de imóvel (EM CONSTRUÇÃO)
/*
// Seletor do tipo de imóvel
    const tiposResidencial = ['Mostrar todos', 'Apartamento', 'Casa', 'Casa de Condomínio', 'Chácara', 'Cobertura', 'Flat', 'Kitnet/Conjugado', 'Lote/Terreno R.',
    'Sobrado', 'Edifício Residencial', 'Fazenda/Sítios/Chácaras'];
    // const tiposComercial = ['Consultório', 'Galpão/Depósito/Armazém', 'Imóvel Comercial', 'Lote C.', 'Ponto Comercial/Loja/Box', 'Sala/Conjunto', 'Prédio/Edifício Inteiro'];
    tiposResidencial.sort();
    escolha = readline.keyInSelect(tiposResidencial, 'Selecione o tipo de imóvel');
    if (escolha < 0) {
        return -1;
    }
    const auxiliar = escolha + 1;
    console.log(auxiliar);
    console.log('Tipo de imóvel selecionado ' + tiposResidencial[escolha]+'\n');
*/

vivareal_crawler(bairros, cidade, readline);


// Retornar genericamente -> Expressões regulares.
function returnMatches(roomText, regex) {
  const regExMatches = roomText.match(regex);
  let result = "N/A";
  if (regExMatches != null) {
      result = regExMatches[0];
  } else {
      throw 'Expressão regular sem correspondência';
  }
  return result;
}
