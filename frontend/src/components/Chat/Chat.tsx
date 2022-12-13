import { useEffect, useState , useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import moment, { Moment } from 'moment';
import './style.css'
import { SocketContext } from '../../context/socket';

import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ClearIcon from '@mui/icons-material/Clear';
import MessageIcon from '@mui/icons-material/Message';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';

interface User {
	id: number;
	username: string;
}

interface Chat {
	id: number;
	type: string;
	name: string;
	users: User[];
	unread: boolean;
}
interface Message {
	id: number;
	message: string;
	sender: User;
	parent: Chat;
	createdAt: string;
}
interface Avatar {
	id: number,
	avatar: string
}

const Chat: React.FC = () => {
	
	const socket = useContext(SocketContext);
	const navigate = useNavigate();
	const [user, setUser] = useState<User | null>(null);
	const [currentChat, setCurrentChat] = useState<Chat | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [chatBoxMsg, setChatBoxMsg] = useState<string>('');
	
	/* Chats */
	const [joinedChats, setJoinedChats] = useState<Chat[]>([]);
	const [publicChats, setPublicChats] = useState<Chat[]>([]);
	const [protectedChats, setProtectedChats] = useState<Chat[]>([]);

	/* Refresh */
	const [pong, setPong] = useState('');

	/* Create Chat Dialog Options */
	const [chatDialogName, setChatDialogName] = useState<string>('');
	const [chatDialogPassword, setChatDialogPassword] = useState<string>('');

	document.body.style.background = '#323232';

	useEffect(() => {
		axios.get('http://localhost:3000/user', { withCredentials: true })
		.then(res => {
			setUser(res.data);
		})
		.catch(err => {
			console.log('err', err);
			if (err.response.data.statusCode === 401)
				navigate('/login');
			alert(err.response.data.message)
		});
	}, []); /* Renders only once */

	/* Means there is a new message so update messages when the chatID == currentChatID*/
	useEffect(() => {
		socket.on('chat/refresh-message', (payload: Message) => {
			if (payload.parent.id === currentChat?.id){
				setMessages((messages) => [payload, ...messages]);
			}
			else {
				/* Enable notification for that channel */
			}
		})
		return () => {
			socket.off('chat/refresh-message');
		}
	}, [socket]);

	/* Retrieving User's Chats */
	useEffect(() => {
		if (!user)
			return;
		axios.get('http://localhost:3000/chat/' + user?.id + '/chats?filter=all', { withCredentials: true })
		.then(res => {
			setJoinedChats(res.data.joined);
			console.log('joinedChats', res.data.joined);
			setPublicChats(res.data.public);
			setProtectedChats(res.data.protected);
		})
		.catch(err => {
			console.log('err', err);
			if (err.response.data.statusCode === 401)
				navigate('/login');
			alert(err.response.data.message)
		});
	}, [user, pong]);

	useEffect(() => {
		if (joinedChats.length === 0) {
			setCurrentChat(null);
			return ;
		}
		setCurrentChat(joinedChats[0]);
	}, [joinedChats]);

	/* Retrieving stats of the currentChat */
	useEffect(() => {
		if (!currentChat)
			return;
		axios.get('http://localhost:3000/chat/' + user?.id + '/messages/' + currentChat.id, { withCredentials: true })
		.then(res => {
			setMessages(res.data);
		})
		.catch(err => {
			console.log('err', err);
			if (err.response.data.statusCode === 401)
				navigate('/login');
			alert(err.response.data.message)
		});
	}, [currentChat]);

	function sendJoinEmitter(chatID: number) {
		socket.emit('chat/join', { chatID: chatID });
	}

	const leaveChannel = (chatID: number) => {
		socket.emit('chat/leave', { chatID: chatID });
		// setPong(new Date().toISOString());

		const chat = joinedChats.find(chat => chat.id === chatID);

		if (chat) {
			if (chat.type === 'GROUP' && chat.users.length !== 1)
				setPublicChats([...publicChats, chat]);
			else if (chat.type === 'GROUP_PROTECTED' && chat.users.length !== 1)
				setProtectedChats([...protectedChats, chat]);
		}
		joinedChats.splice(joinedChats.findIndex(chat => chat.id === chatID), 1);
		setJoinedChats([...joinedChats]);
	}

	function joinPublic(chat: Chat) {
		const payload = {
			chatID: chat.id
		}

		console.log('joinPublic', payload);
		axios.patch('http://localhost:3000/chat/' + user?.id + '/join', payload, { withCredentials: true })
		.then(res => {
			sendJoinEmitter( chat.id );
			setPong(new Date().toISOString());
		})
		.catch(err => {
			if (err.response.data.statusCode === 418)
				navigate('/login');
			alert(err.response.data.message)
		});
	}
	function joinProtected(chat: Chat) {
		const payload = {
			chatID: chat.id,
			password: prompt('Please enter the password')
		}
		console.log('joinProtected', payload);
		axios.patch('http://localhost:3000/chat/' + user?.id + '/join', payload, { withCredentials: true })
		.then(res => {
			setPong(new Date().toISOString());
			alert('Success');
			sendJoinEmitter( chat.id );
		})
		.catch(err => {
			if (err.response.data.statusCode === 418)
				navigate('/login');
			alert(err.response.data.message)
		});
	}

	const handleChatClick = (chat: Chat, joined: boolean) => {
		console.log('currentChat', currentChat);
		if (currentChat?.id === chat.id)
			return;
		console.log('chat', chat);

		if (joined == true) {
			setCurrentChat(chat);
			return;
		}
		else if (chat.type === 'GROUP') {
			joinPublic(chat);
		}
		else if (chat.type === 'GROUP_PROTECTED') {
			joinProtected(chat);
		}
	}
	function renderChatBox(chat: any, joined: boolean) {
		let selected;
		if (!currentChat)
			selected = false;
		else
			selected = currentChat.id == chat.id;

		if (chat.type === 'PRIVATE') {
			return (
				<div className={selected ? 'chat selected' : 'chat' } key={chat.id} onClick={(event) => handleChatClick(chat, joined)}>
					<p className='title' >{ chat.name }</p>
					{
						joined == true ?
						<IconButton className='options' aria-label="options-button" sx={{ color: 'white' }}>
							<MessageIcon />
						</IconButton>
						:
						<IconButton className='options' aria-label="options-button" sx={{ color: 'white' }}>
							<AddIcon />
						</IconButton>
					}
					<p className='type' >{ 'private' }</p>
				</div>
			)
		}
		else {
			return (
				<div className={selected ? 'chat selected' : 'chat' } key={chat.id} onClick={(event) => handleChatClick(chat, joined)}>
					<p className='title' >{ chat.name }</p>
					{
						joined == true ?
						<IconButton className='options' aria-label="options-button" sx={{ color: 'white' }} onClick={() => { leaveChannel(chat.id) }}>
							<ClearIcon />
						</IconButton>
						:
						<IconButton className='options' aria-label="options-button" sx={{ color: 'white' }}>
							<AddIcon />
						</IconButton>
					}
					<p className='type' >{ chat.type == 'GROUP_PROTECTED' ? 'protected' : 'public' }</p>
				</div>
			)
		}
	}

	/* Handle Dialogs */
	const [open, setOpen] = useState(false);

	const handleChatCreateDialogClickOpen = () => {
		setOpen(true);
	};

	const handleChatCreateDialog = () => {
		/* Parsing chatDialogPassword and chatDialogName */
		if (chatDialogName === '') {
			alert('Name cannot be empty');
			return ;
		}
		if (chatDialogName.length > 20) {
			alert('Name cannot be longer than 20 characters');
			return ;
		}
		if (chatDialogName.length < 3) {
			alert('Name must be at least 3 characters long');
			return ;
		}
		if (chatDialogPassword && chatDialogPassword.length > 20) {
			alert('Password cannot be longer than 20 characters');
			return ;
		}
		if (chatDialogPassword && chatDialogPassword.length < 6) {
			alert('Password must be at least 6 characters long');
			return ;
		}
		let chatPayload;
		if (chatDialogPassword) { /* GROUP_PROTECTED */
			chatPayload = {
				name: chatDialogName,
				type: 'GROUP_PROTECTED',
				password: chatDialogPassword,
			}
		}
		else { /* GROUP_PUBLIC */
			chatPayload = {
				name: chatDialogName,
				type: 'GROUP',
			}
		}
		axios.post('http://localhost:3000/chat/' + user?.id + '/create', chatPayload, { withCredentials: true })
		.then(res => {
			console.log('res', res);
			setPong(new Date().toISOString());
			alert('Success');
			setOpen(false);
		})
		.catch(err => {
			console.log('err', err);
			if (err.response.data.statusCode === 401)
				navigate('/login');
			alert(err.response.data.message)
		});

		setChatDialogName('');
		setChatDialogPassword('');
	}

	const handleChatCreateDialogClose = () => {
		setOpen(false);
	};



	function renderChannels(divName: string) {
		console.log('publicChats.lenght', publicChats.length);
		console.log('joinedChats.lenght', joinedChats.length);
		console.log('protectedChats.lenght', protectedChats.length);

		return (
			<div className={divName}>
				<h1>Channels</h1>
				<button className='add' onClick={handleChatCreateDialogClickOpen}>+</button>
				<div className='general'>
					{
						/* Joined Chats */
						currentChat ?
						<div className={ 'chat crossection' }>
							<p className='title' >{ 'Joined Chats' }</p>
						</div>
							:
						<div className={ 'chat crossection' }>
							<p className='title' >{ 'No chats joined ' }</p>
						</div>
					}
					{
						joinedChats.map((chat: Chat) => {
							return ( renderChatBox(chat, true) )
						})
					}

					{
						/* Public Chats */
						publicChats.length > 0 &&
						<div className={ 'chat crossection' }>
							<p className='title' >{ 'Public Chats' }</p>
						</div>
					}
					{
						publicChats.map((chat: Chat) => {
							return ( renderChatBox(chat, false) )
						})
					}

					{
						/* Protected Chats */
						protectedChats.length > 0 &&
							<div className={ 'chat crossection' }>
								<p className='title' >{ 'Password Protected Chats' }</p>
							</div>
					}
					{
						protectedChats.map((chat: Chat) => {
							return ( renderChatBox(chat, false) )
						})
					}
				</div>
			</div>
		)
	}
	function renderMessages(divName: string) {
		if (currentChat == null)
			return (
				<div className={divName}>
					<h1>Choose a chat</h1>
				</div>
			)
		return (
			<div className={divName}>
				<h2 className='chatName'>{currentChat.name}</h2>
				{
					messages.map((message, index)=> {
						return (
							<div className={!(index % 2) ? 'container' : 'container darker'} key={index}>
								<p className={!(index % 2) ? 'right' : ''}>{!(index % 2) ? message.sender.username : ''}</p>
								<p>{message.message}</p>
								<span className="time-right">{moment(Number(message.createdAt)).format('DD dddd HH:mm:ss')}</span>
								<p className={(index % 2) ? '' : 'right'}>{(index % 2) ? message.sender.username : ''}</p>
							</div>
						);
					})
				}
			</div>
		)
	}

	function renderPlayers(divName: string) {
		return (
			<div className={divName}>
				<h3>Players</h3>
				<ul>
					{
						currentChat == null ? <p>No players</p> :
						currentChat.users.map(player => {
							return (
								<li key={player.id}>
									<p className="room-name-clickable">{player.username}</p>
								</li>
							);
						})
					}
				</ul>
			</div>
		)
	}
	
	return (
		<div className="main-container">
			{renderChannels("block channels")}
			{renderMessages("block messages")}
			{renderPlayers("block players")}

		<Dialog open={open} onClose={handleChatCreateDialogClose}>
			<DialogTitle>Create Group</DialogTitle>
			<DialogContent>
				<DialogContentText>
				To create a password-protected group, simply enter a password when prompted. If you do not enter a password, the group will be open to anyone. To create a private chat with another person, you must first follow that person.
				</DialogContentText>
				<TextField
					autoFocus
					margin="dense"
					id="groupname"
					label="Group Name"
					type="text"
					required={true}
					fullWidth
					onChange={event => setChatDialogName(event.currentTarget.value)}
					variant="standard"
				/>
				<TextField
					autoFocus
					margin="dense"
					id="password"
					label="Password"
					type="password"
					required={false}
					fullWidth
					onChange={event => setChatDialogPassword(event.currentTarget.value)}
					variant="standard"
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleChatCreateDialogClose} color='error'>Cancel</Button>
				<Button onClick={handleChatCreateDialog}>Subscribe</Button>
			</DialogActions>
		</Dialog>
		</div>
	);
}
export default Chat;





