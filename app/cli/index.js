import arg from 'arg';
import open from 'open';

export function main(argv) {
  const args = arg(
    {
      '--help': Boolean,
      '-h': '--help',
      '--local': Boolean,
      '-l': '--local',
      '--dont-trim': Boolean, // launcher-icon-generator
      '-d': '--dont-trim',
      '--padding': Number, // launcher-icon-generator
      '-p': '--padding',
      '--fore-color': String, // launcher-icon-generator
      '-f': '--fore-color',
      '--back-color': String, // launcher-icon-generator
      '-b': '--back-color',
      '--crop': String, // launcher-icon-generator
      '-c': '--crop',
      '--shape': String, // launcher-icon-generator
      '-s': '--shape',
      '--effect': String, // launcher-icon-generator
      '-e': '--effect',
      '--name': String, // launcher-icon-generator
      '-n': '--name',
    },
    {
      argv: argv.slice(2),
    }
  );

  const generator = args._[0];
  const hostUrl = args['--local']
    ? 'http://localhost:3000'
    : 'https://romannurik.github.io/AndroidAssetStudio';
  let paramPrefix = '#';

  if (args['--help']) {
    console.info(`android-asset-studio`);
    console.info(`CLI launcher`);
    console.info();
    console.info(`USAGE:`);
    console.info(`    android-asset-studio [SUBCOMMAND] [OPTIONS]`);
    console.info();
    console.info(`SUBCOMMANDS:`);
    console.info(
      `    launcher-icon-generator    Opens a launcher icon generator with the given settings.`
    );
    console.info();
    console.info(`COMMANDS):`);
    console.info(`    -h, --help     Prints help information.`);
    console.info(`    -l, --local    Uses the local build, instead.`);
    console.info();
    console.info(`COMMANDS (launcher-icon-generator):`);
    console.info(`    -d, --dont-trim     Don't trim the whitespace.`);
    console.info(
      `    -p, --padding       Padding to the foreground from -0.1 to 0.5.`
    );
    console.info(
      `    -f, --fore-color    RBGA foreground web color for logo colorization.`
    );
    console.info(`                        Format: rgba(255, 255, 255, 255)`);
    console.info(
      `    -b, --back-color    RBGA filling background web color for the logo container.`
    );
    console.info(`                        Format: rgb(255, 255, 255), #ffffff`);
    console.info(`    -c, --crop          Crop logo instead of centering it.`);
    console.info(`    -s, --shape         Shape of the logo container.`);
    console.info(
      `                        Possible values: none, square, circle, vrect, hrect`
    );
    console.info(
      `    -e, --effect        Effect of the logo on its container.`
    );
    console.info(
      `                        Possible values: none, elevate, shadow, score`
    );
    console.info(`    -n, --name          Name of the exported ZIP.`);
    console.info();
  } else if (generator == 'launcher-icon-generator') {
    let url = `${hostUrl}/icons-launcher.html`;
    url += `${paramPrefix}foreground.space.trim=${
      args['--dont-trim'] ? '0' : '1'
    }`;
    paramPrefix = '&';
    if (args['--padding']) {
      url += `${paramPrefix}foreground.space.pad=${decodeURIComponent(
        args['--padding']
      )}`;
    }
    if (args['--fore-color']) {
      url += `${paramPrefix}foreColor=${decodeURIComponent(
        args['--fore-color']
      )}`;
    }
    if (args['--back-color']) {
      url += `${paramPrefix}backColor=${decodeURIComponent(
        args['--back-color']
      )}`;
    }
    if (args['--crop']) {
      url += `${paramPrefix}crop=${args['--crop'] ? '1' : '0'}`;
    }
    if (args['--shape']) {
      url += `${paramPrefix}backgroundShape=${decodeURIComponent(
        args['--shape']
      )}`;
    }
    if (args['--effect']) {
      url += `${paramPrefix}effects=${decodeURIComponent(args['--effect'])}`;
    }
    if (args['--name']) {
      url += `${paramPrefix}name=${decodeURIComponent(args['--name'])}`;
    }
    console.log(`Opening ${url}`);
    open(url);
  } else if (!generator) {
    console.error(`Generator was not defined.`);
  } else {
    console.error(
      `Generator ${generator} was not found or has no available CLI module.`
    );
  }
}
