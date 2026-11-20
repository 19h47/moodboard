"""
Writes the shortcut of an iPhone that shares to the moodboard, Moodboard.shortcut, signed, as a release attaches it:
iOS lets no web app into its share sheet (see the FAQ of README.txt). Each item shared is sorted and added through the
REST API, with an application password of core, without opening the app: an image to wp/v2/media, else a link or a page
to wp/v2/moodboard-links, which WordPress describes, else a text to wp/v2/moodboard-texts.

Its file holds no secret: the questions of its import fill the address of the site, the login and the application
password, as one adds it.

Run on a Mac, whose `shortcuts` signs it: python3 bin/make-shortcut.py [output] [site], Moodboard.shortcut and
https://stepper.19h47.fr by default.
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


output_path = sys.argv[1] if len(sys.argv) > 1 else 'Moodboard.shortcut'
# The site the import offers, which a test changes for a server of its own.
default_site = sys.argv[2] if len(sys.argv) > 2 else 'https://stepper.19h47.fr'

ids = {name: new_id() for name in ('site', 'login', 'password', 'credentials', 'base64', 'urls', 'extension', 'match', 'jpeg', 'link')}
repeat, if_link, if_image, if_added, if_links, if_texts = (new_id() for _ in range(6))

# What the items shared add up to, as the repeat goes: the media added, the links and the texts to add once it ends.
ADDED = {'Type': 'Variable', 'VariableName': 'Ajouts'}
LINKS = {'Type': 'Variable', 'VariableName': 'Liens'}
TEXTS = {'Type': 'Variable', 'VariableName': 'Textes'}

site = output('Texte', ids['site'])


def add_block(route, form, variable=None):
    """
    The actions that add a block through the REST API, its form as given: WordPress answers the block added, with its
    ID, kept in `variable` when named; else it says why not, which an alert shows before the shortcut stops. Its answer
    is read as a text first: a page of the server, such as an error of the host, is no dictionary, which Shortcuts
    would fail to read before the alert.
    """
    response, has_id, block_id, if_failed = new_id(), new_id(), new_id(), new_id()
    added = [
        action(
            'downloadurl',
            UUID=response,
            WFURL=text(site, f'/wp-json/wp/v2/{route}'),
            WFHTTPMethod='POST',
            ShowHeaders=True,
            WFHTTPHeaders=fields([
                {'WFItemType': 0, 'WFKey': text('Authorization'), 'WFValue': text('Basic ', output('Texte encodé en base64', ids['base64']))},
            ]),
            WFHTTPBodyType='Form',
            WFFormValues=fields(form),
        ),
        action('text.match', UUID=has_id, WFMatchTextPattern=text(r'"id"\s*:\s*\d+'), text=text(output('Contenu de l’URL', response))),
        action('conditional', GroupingIdentifier=if_failed, WFControlFlowMode=0, WFCondition=101, WFInput=condition_input(output('Correspondances', has_id))),
        action('alert', WFAlertActionTitle='Moodboard', WFAlertActionMessage=text('Rien n’a été ajouté : ', output('Contenu de l’URL', response)), WFAlertActionCancelButtonShown=False),
        action('exit'),
        action('conditional', GroupingIdentifier=if_failed, WFControlFlowMode=2, UUID=new_id()),
    ]
    if variable:
        added.extend([
            action('getvalueforkey', UUID=block_id, WFDictionaryKey='id', WFInput=attachment(output('Contenu de l’URL', response))),
            action('appendvariable', WFVariableName=variable, WFInput=attachment(output('Valeur du dictionnaire', block_id))),
        ])
    return added


actions = [
    # The questions of the import fill the first three: nothing secret is in the file. An answer left as offered is not
    # written in its action, which keeps its own value: the site is written in it already.
    action('gettext', UUID=ids['site'], WFTextActionText=text(default_site)),
    action('gettext', UUID=ids['login'], WFTextActionText=text('')),
    action('gettext', UUID=ids['password'], WFTextActionText=text('')),
    action('gettext', UUID=ids['credentials'], WFTextActionText=text(output('Texte', ids['login']), ':', output('Texte', ids['password']))),
    action('base64encode', UUID=ids['base64'], WFEncodeMode='Encode', WFBase64LineBreakMode='None', WFInput=attachment(output('Texte', ids['credentials']))),
    # Each item shared, as an app shares several, such as an image and the link of its post.
    action('repeat.each', GroupingIdentifier=repeat, WFControlFlowMode=0, WFInput=attachment(INPUT)),
    # A link or a page first: asked for its images, Shortcuts would draw the page itself. Get URLs takes a text, the
    # variable written in it: given the variable alone, it reads nothing.
    action('detect.link', UUID=ids['urls'], WFInput=text(REPEAT_ITEM)),
    action('conditional', GroupingIdentifier=if_link, WFControlFlowMode=0, WFCondition=100, WFInput=condition_input(output('URL', ids['urls']))),
    action('appendvariable', WFVariableName='Liens', WFInput=attachment(output('URL', ids['urls']))),
    action('conditional', GroupingIdentifier=if_link, WFControlFlowMode=1),
    # An image file only, by its extension, whatever the language of the phone: asked for its images, Shortcuts would
    # draw a text or a note as a PDF.
    action('properties.files', UUID=ids['extension'], WFInput=attachment(REPEAT_ITEM), WFContentItemPropertyName='File Extension'),
    action('text.match', UUID=ids['match'], WFMatchTextPattern=text('^(jpe?g|png|hei[cf]|gif|webp|tiff?|avif)$'), text=text(output('Extension du fichier', ids['extension'])), WFMatchTextCaseSensitive=False),
    action('conditional', GroupingIdentifier=if_image, WFControlFlowMode=0, WFCondition=100, WFInput=condition_input(output('Correspondances', ids['match']))),
    # A photo of an iPhone is HEIC.
    action('image.convert', UUID=ids['jpeg'], WFImageFormat='JPEG', WFImagePreserveMetadata=True, WFInput=attachment(REPEAT_ITEM)),
    *add_block('media', [
        # A file wraps its variable one level deeper than a text: else Shortcuts leaves the field out.
        {'WFItemType': 5, 'WFKey': text('file'), 'WFValue': {'Value': attachment(output('Image convertie', ids['jpeg'])), 'WFSerializationType': 'WFTokenAttachmentParameterState'}},
        {'WFItemType': 0, 'WFKey': text('meta[moodboard_block]'), 'WFValue': text('1')},
    ], 'Ajouts'),
    action('conditional', GroupingIdentifier=if_image, WFControlFlowMode=1),
    action('appendvariable', WFVariableName='Textes', WFInput=attachment(REPEAT_ITEM)),
    action('conditional', GroupingIdentifier=if_image, WFControlFlowMode=2, UUID=new_id()),
    action('conditional', GroupingIdentifier=if_link, WFControlFlowMode=2, UUID=new_id()),
    action('repeat.each', GroupingIdentifier=repeat, WFControlFlowMode=2, UUID=new_id()),
    # An image added is what was shared, the link of its post left aside. Else the first link is added, WordPress giving
    # it its title and its image, else the texts, as one.
    action('conditional', GroupingIdentifier=if_added, WFControlFlowMode=0, WFCondition=101, WFInput=condition_input(ADDED)),
    action('conditional', GroupingIdentifier=if_links, WFControlFlowMode=0, WFCondition=100, WFInput=condition_input(LINKS)),
    action('getitemfromlist', UUID=ids['link'], WFItemSpecifier='First Item', WFInput=attachment(LINKS)),
    *add_block('moodboard-links', [
        {'WFItemType': 0, 'WFKey': text('meta[moodboard_source]'), 'WFValue': text(output('Élément de la liste', ids['link']))},
    ]),
    action('conditional', GroupingIdentifier=if_links, WFControlFlowMode=1),
    action('conditional', GroupingIdentifier=if_texts, WFControlFlowMode=0, WFCondition=100, WFInput=condition_input(TEXTS)),
    *add_block('moodboard-texts', [
        {'WFItemType': 0, 'WFKey': text('content'), 'WFValue': text(TEXTS)},
    ]),
    action('conditional', GroupingIdentifier=if_texts, WFControlFlowMode=2, UUID=new_id()),
    action('conditional', GroupingIdentifier=if_links, WFControlFlowMode=2, UUID=new_id()),
    action('conditional', GroupingIdentifier=if_added, WFControlFlowMode=2, UUID=new_id()),
    # Added without opening the app: a notification says it is.
    action('notification', WFNotificationActionTitle=text('Moodboard'), WFNotificationActionBody=text('Ajouté au moodboard.'), WFNotificationActionSound=False),
]

workflow = {
    'WFWorkflowClientVersion': '3600.0.1',
    'WFWorkflowMinimumClientVersion': 900,
    'WFWorkflowMinimumClientVersionString': '900',
    # The bookmark of the app, on its dark gray: the glyph and the color of the palette of Shortcuts closest to its icon.
    'WFWorkflowIcon': {'WFWorkflowIconStartColor': 0x000000FF, 'WFWorkflowIconGlyphNumber': 0xE916},
    'WFWorkflowTypes': ['ActionExtension'],
    # Anything, as an app shares an image as a file, or a post as rich text: the shortcut sorts it.
    'WFWorkflowInputContentItemClasses': [
        'WFAppStoreAppContentItem', 'WFArticleContentItem', 'WFContactContentItem', 'WFDateContentItem',
        'WFEmailAddressContentItem', 'WFGenericFileContentItem', 'WFImageContentItem', 'WFiTunesProductContentItem',
        'WFLocationContentItem', 'WFDCMapsLinkContentItem', 'WFAVAssetContentItem', 'WFPDFContentItem',
        'WFPhoneNumberContentItem', 'WFRichTextContentItem', 'WFSafariWebPageContentItem', 'WFStringContentItem',
        'WFURLContentItem',
    ],
    'WFWorkflowHasShortcutInputVariables': True,
    'WFWorkflowImportQuestions': [
        {'ActionIndex': 0, 'Category': 'Parameter', 'ParameterKey': 'WFTextActionText', 'DefaultValue': default_site, 'Text': 'L’adresse du site, sans / à la fin'},
        {'ActionIndex': 1, 'Category': 'Parameter', 'ParameterKey': 'WFTextActionText', 'DefaultValue': '', 'Text': 'Ton identifiant WordPress'},
        {'ActionIndex': 2, 'Category': 'Parameter', 'ParameterKey': 'WFTextActionText', 'DefaultValue': '', 'Text': 'Le mot de passe d’application créé dans ton profil WordPress'},
    ],
    'WFWorkflowActions': actions,
    'WFQuickActionSurfaces': [],
}

with tempfile.TemporaryDirectory() as directory:
    unsigned = os.path.join(directory, 'Moodboard.shortcut')

    with open(unsigned, 'wb') as file:
        plistlib.dump(workflow, file, fmt=plistlib.FMT_BINARY)

    # Signed for anyone, as a file of a release is opened by its curator on their iPhone.
    subprocess.run(['shortcuts', 'sign', '--mode', 'anyone', '--input', unsigned, '--output', output_path], check=True)
