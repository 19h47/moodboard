"""
Writes the shortcut of an iPhone that shares to the moodboard, Moodboard.shortcut, signed, as a release attaches it:
iOS lets no web app into its share sheet (see the FAQ of README.txt). An image shared goes to wp/v2/media, with an
application password of core, without opening the app; a page or a text opens the + of the app, written with it.

Its file holds no secret: the questions of its import fill the address of the site, the login and the application
password, as one adds it.

Run on a Mac, whose `shortcuts` signs it: python3 bin/make-shortcut.py [output], Moodboard.shortcut by default.
"""
import os
import plistlib
import subprocess
import sys
import tempfile
import uuid

OBJ = '￼'


def new_id():
    return str(uuid.uuid4()).upper()


def output(name, uid):
    return {'OutputName': name, 'OutputUUID': uid, 'Type': 'ActionOutput'}


INPUT = {'Type': 'ExtensionInput'}
REPEAT_ITEM = {'Type': 'Variable', 'VariableName': 'Repeat Item'}


def attachment(value):
    return {'Value': value, 'WFSerializationType': 'WFTextTokenAttachment'}


def text(*parts):
    """A text of strings and variables, in order."""
    string, ranges = '', {}
    for part in parts:
        if isinstance(part, str):
            string += part
        else:
            ranges[f'{{{len(string)}, 1}}'] = part
            string += OBJ
    return {'Value': {'string': string, 'attachmentsByRange': ranges}, 'WFSerializationType': 'WFTextTokenString'}


def condition_input(value):
    return {'Type': 'Variable', 'Variable': attachment(value)}


def fields(items):
    return {'Value': {'WFDictionaryFieldValueItems': items}, 'WFSerializationType': 'WFDictionaryFieldValue'}


def action(identifier, **parameters):
    return {'WFWorkflowActionIdentifier': f'is.workflow.actions.{identifier}', 'WFWorkflowActionParameters': parameters}


ids = {name: new_id() for name in ('site', 'login', 'password', 'credentials', 'base64', 'images', 'jpeg', 'urls', 'url_encoded', 'text_encoded')}
if_images, repeat, if_urls = new_id(), new_id(), new_id()

site = output('Texte', ids['site'])
actions = [
    # The questions of the import fill the first three: nothing secret is in the file.
    action('gettext', UUID=ids['site'], WFTextActionText=text('https://stepper.19h47.fr')),
    action('gettext', UUID=ids['login'], WFTextActionText=text('')),
    action('gettext', UUID=ids['password'], WFTextActionText=text('')),
    action('gettext', UUID=ids['credentials'], WFTextActionText=text(output('Texte', ids['login']), ':', output('Texte', ids['password']))),
    action('base64encode', UUID=ids['base64'], WFEncodeMode='Encode', WFBase64LineBreakMode='None', WFInput=attachment(output('Texte', ids['credentials']))),
    action('detect.images', UUID=ids['images'], WFInput=attachment(INPUT)),
    action('conditional', GroupingIdentifier=if_images, WFControlFlowMode=0, WFCondition=100, WFInput=condition_input(output('Images', ids['images']))),
    action('repeat.each', GroupingIdentifier=repeat, WFControlFlowMode=0, WFInput=attachment(output('Images', ids['images']))),
    # A photo of an iPhone is HEIC.
    action('image.convert', UUID=ids['jpeg'], WFImageFormat='JPEG', WFImagePreserveMetadata=True, WFInput=attachment(REPEAT_ITEM)),
    action(
        'downloadurl',
        WFURL=text(site, '/wp-json/wp/v2/media'),
        WFHTTPMethod='POST',
        ShowHeaders=True,
        WFHTTPHeaders=fields([
            {'WFItemType': 0, 'WFKey': text('Authorization'), 'WFValue': text('Basic ', output('Texte encodé en base64', ids['base64']))},
        ]),
        WFHTTPBodyType='Form',
        WFFormValues=fields([
            {'WFItemType': 5, 'WFKey': text('file'), 'WFValue': {'Value': output('Image convertie', ids['jpeg']), 'WFSerializationType': 'WFTokenAttachmentParameterState'}},
            {'WFItemType': 0, 'WFKey': text('meta[moodboard_block]'), 'WFValue': text('1')},
        ]),
    ),
    action('repeat.each', GroupingIdentifier=repeat, WFControlFlowMode=2, UUID=new_id()),
    # Sent without opening the app: a notification says it is.
    action('notification', WFNotificationActionTitle=text('Moodboard'), WFNotificationActionBody=text('Ajouté au moodboard.'), WFNotificationActionSound=False),
    action('conditional', GroupingIdentifier=if_images, WFControlFlowMode=1),
    action('detect.link', UUID=ids['urls'], WFInput=attachment(INPUT)),
    action('conditional', GroupingIdentifier=if_urls, WFControlFlowMode=0, WFCondition=100, WFInput=condition_input(output('URL', ids['urls']))),
    action('urlencode', UUID=ids['url_encoded'], WFEncodeMode='Encode', WFInput=attachment(output('URL', ids['urls']))),
    action('openurl', WFInput=text(site, '/wp-admin/upload.php?page=moodboard&moodboard-url=', output('Texte encodé en URL', ids['url_encoded']))),
    action('conditional', GroupingIdentifier=if_urls, WFControlFlowMode=1),
    action('urlencode', UUID=ids['text_encoded'], WFEncodeMode='Encode', WFInput=attachment(INPUT)),
    action('openurl', WFInput=text(site, '/wp-admin/upload.php?page=moodboard&moodboard-text=', output('Texte encodé en URL', ids['text_encoded']))),
    action('conditional', GroupingIdentifier=if_urls, WFControlFlowMode=2, UUID=new_id()),
    action('conditional', GroupingIdentifier=if_images, WFControlFlowMode=2, UUID=new_id()),
]

workflow = {
    'WFWorkflowClientVersion': '3600.0.1',
    'WFWorkflowMinimumClientVersion': 900,
    'WFWorkflowMinimumClientVersionString': '900',
    # The bookmark of the app, on its dark gray: the glyph and the color of the palette of Shortcuts closest to its icon.
    'WFWorkflowIcon': {'WFWorkflowIconStartColor': 0x000000FF, 'WFWorkflowIconGlyphNumber': 0xE916},
    'WFWorkflowTypes': ['ActionExtension'],
    'WFWorkflowInputContentItemClasses': ['WFImageContentItem', 'WFURLContentItem', 'WFStringContentItem', 'WFSafariWebPageContentItem'],
    'WFWorkflowHasShortcutInputVariables': True,
    'WFWorkflowImportQuestions': [
        {'ActionIndex': 0, 'Category': 'Parameter', 'ParameterKey': 'WFTextActionText', 'DefaultValue': 'https://stepper.19h47.fr', 'Text': 'L’adresse du site, sans / à la fin'},
        {'ActionIndex': 1, 'Category': 'Parameter', 'ParameterKey': 'WFTextActionText', 'DefaultValue': '', 'Text': 'Ton identifiant WordPress'},
        {'ActionIndex': 2, 'Category': 'Parameter', 'ParameterKey': 'WFTextActionText', 'DefaultValue': '', 'Text': 'Le mot de passe d’application créé dans ton profil WordPress'},
    ],
    'WFWorkflowActions': actions,
    'WFQuickActionSurfaces': [],
}

output_path = sys.argv[1] if len(sys.argv) > 1 else 'Moodboard.shortcut'

with tempfile.TemporaryDirectory() as directory:
    unsigned = os.path.join(directory, 'Moodboard.shortcut')

    with open(unsigned, 'wb') as file:
        plistlib.dump(workflow, file, fmt=plistlib.FMT_BINARY)

    # Signed for anyone, as a file of a release is opened by its curator on their iPhone.
    subprocess.run(['shortcuts', 'sign', '--mode', 'anyone', '--input', unsigned, '--output', output_path], check=True)
